import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Literal
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool
from core import db, now, iso, parse_dt, require_roles, get_gmina
from routes_owner import PLANS

router = APIRouter(prefix="/api")
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
TAX_MODE = "full"
admin = require_roles("gmina_admin")


def lookup_key(plan, cycle):
    return f"arbotag_{plan}_{cycle}"


def setup_catalog():
    for plan, info in PLANS.items():
        pid = f"arbotag_{plan}"
        product = None
        for p in stripe.Product.list(active=True, limit=100).auto_paging_iter():
            if (p.to_dict().get("metadata") or {}).get("emergent_product_id") == pid:
                product = p
                break
        name = f"ARBIX — pakiet {info['name']}"
        if not product:
            product = stripe.Product.create(name=name, tax_code="txcd_10103001",
                                            metadata={"managed_by": "emergent", "emergent_product_id": pid})
        elif product.name != name:
            product = stripe.Product.modify(product.id, name=name)
        for cycle in ("month", "year"):
            lk = lookup_key(plan, cycle)
            amount = int(round(info[cycle] * 100))
            ex = stripe.Price.list(lookup_keys=[lk], active=True, limit=1).data
            if ex and (ex[0].unit_amount != amount or ex[0].currency != "pln"):
                stripe.Price.modify(ex[0].id, active=False)
                ex = []
            if not ex:
                stripe.Price.create(product=product.id, unit_amount=amount, currency="pln", lookup_key=lk,
                                    transfer_lookup_key=True, recurring={"interval": cycle})


class CheckoutIn(BaseModel):
    cycle: Literal["month", "year"]
    origin_url: str


@router.get("/billing/plans")
async def plans():
    return PLANS


@router.post("/billing/checkout")
async def checkout(body: CheckoutIn, u: dict = Depends(admin)):
    g = await get_gmina(u["gmina_id"])
    lk = lookup_key(g.get("plan") or "mala", body.cycle)
    prices = await run_in_threadpool(lambda: stripe.Price.list(lookup_keys=[lk], active=True, limit=1).data)
    if not prices:
        await run_in_threadpool(setup_catalog)
        prices = await run_in_threadpool(lambda: stripe.Price.list(lookup_keys=[lk], active=True, limit=1).data)
    if not prices:
        raise HTTPException(500, "Nie znaleziono cennika")
    price = prices[0]
    origin = body.origin_url.rstrip("/")
    kwargs = dict(
        line_items=[{"price": price.id, "quantity": 1}], mode="subscription",
        success_url=f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin}/payment/cancel",
        metadata={"gmina_id": g["id"], "user_id": u["id"], "lookup_key": lk, "cycle": body.cycle},
        subscription_data={"metadata": {"gmina_id": g["id"]}},
        locale="pl",
    )

    def create():
        try:
            return stripe.checkout.Session.create(**kwargs, managed_payments={"enabled": True})
        except stripe.error.InvalidRequestError as e:
            logging.warning(f"managed payments unavailable: {e.user_message}")
        try:
            return stripe.checkout.Session.create(**kwargs, automatic_tax={"enabled": True}, billing_address_collection="required")
        except stripe.error.InvalidRequestError as e:
            logging.warning(f"automatic tax unavailable: {e.user_message}")
        return stripe.checkout.Session.create(**kwargs)

    session = await run_in_threadpool(create)
    await db.payment_transactions.insert_one({
        "session_id": session.id, "user_id": u["id"], "gmina_id": g["id"], "lookup_key": lk, "cycle": body.cycle,
        "amount": (price.unit_amount or 0) / 100.0, "currency": price.currency, "status": "initiated",
        "payment_status": "pending", "created_at": iso(now()), "updated_at": iso(now()),
    })
    return {"checkout_url": session.url, "session_id": session.id}


async def _mark_paid(session_id, subscription_id):
    r = await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"status": "completed", "payment_status": "paid", "stripe_subscription_id": subscription_id, "updated_at": iso(now())}})
    if not r.modified_count:
        return
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    g = await get_gmina(tx["gmina_id"])
    start = max(now(), parse_dt(g.get("paid_until")) or now(), parse_dt(g.get("trial_until")) or now())
    until = start + (timedelta(days=366) if tx["cycle"] == "year" else timedelta(days=31))
    await db.gminas.update_one({"id": g["id"]}, {"$set": {"paid_until": iso(until), "billing_cycle": tx["cycle"],
                                                          "stripe_subscription_id": subscription_id, "auto_renew": True}})


@router.get("/payments/status/{session_id}")
async def pay_status(session_id: str):
    rec = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "Nie znaleziono transakcji")
    if rec.get("payment_status") != "paid":
        try:
            s = await run_in_threadpool(stripe.checkout.Session.retrieve, session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await _mark_paid(session_id, s.subscription)
            elif s.status == "expired":
                await db.payment_transactions.update_one({"session_id": session_id}, {"$set": {"status": "expired", "payment_status": "expired"}})
            rec = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        except stripe.error.StripeError:
            pass
    return {"session_id": rec["session_id"], "status": rec["status"], "payment_status": rec["payment_status"]}


@router.post("/billing/cancel-renewal")
async def cancel_renewal(u: dict = Depends(admin)):
    g = await get_gmina(u["gmina_id"])
    sid = g.get("stripe_subscription_id")
    if not sid:
        raise HTTPException(400, "Brak aktywnej subskrypcji kartą")
    await run_in_threadpool(lambda: stripe.Subscription.modify(sid, cancel_at_period_end=True))
    await db.gminas.update_one({"id": g["id"]}, {"$set": {"auto_renew": False}})
    return {"ok": True}


@router.get("/billing/history")
async def history(u: dict = Depends(admin)):
    return await db.payment_transactions.find({"gmina_id": u["gmina_id"], "payment_status": "paid"}, {"_id": 0, "session_id": 0}).sort("created_at", -1).to_list(200)


@router.post("/stripe/webhook")
async def webhook(request: Request):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, request.headers.get("stripe-signature", ""), WEBHOOK_SECRET)
    except (stripe.error.SignatureVerificationError, ValueError):
        raise HTTPException(400, "Invalid signature")
    handler = WEBHOOK_HANDLERS.get(event["type"])
    if handler:
        await handler(event["data"]["object"])
    return {"status": "ok"}


async def _on_checkout_paid(obj):
    if obj.get("payment_status") == "paid" or obj.get("status") == "complete":
        await _mark_paid(obj["id"], obj.get("subscription"))


async def _on_checkout_failed(obj):
    await db.payment_transactions.update_one({"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
                                             {"$set": {"status": "failed", "payment_status": "failed", "updated_at": iso(now())}})


async def _on_invoice_paid(obj):
    if obj.get("billing_reason") != "subscription_cycle":
        return
    sid = obj.get("subscription") or ((obj.get("parent") or {}).get("subscription_details") or {}).get("subscription")
    lines = (obj.get("lines") or {}).get("data") or []
    if sid and lines:
        end = datetime.fromtimestamp(lines[0]["period"]["end"], tz=timezone.utc)
        await db.gminas.update_one({"stripe_subscription_id": sid}, {"$set": {"paid_until": iso(end + timedelta(days=1))}})


async def _on_subscription_deleted(obj):
    await db.gminas.update_one({"stripe_subscription_id": obj["id"]}, {"$set": {"auto_renew": False, "stripe_subscription_id": None}})


WEBHOOK_HANDLERS = {
    "checkout.session.completed": _on_checkout_paid,
    "checkout.session.async_payment_succeeded": _on_checkout_paid,
    "checkout.session.expired": _on_checkout_failed,
    "checkout.session.async_payment_failed": _on_checkout_failed,
    "invoice.paid": _on_invoice_paid,
    "customer.subscription.deleted": _on_subscription_deleted,
}
