from datetime import datetime, timedelta, timezone
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from core import db, now, iso, new_id, hash_pw, make_code, require_roles, subscription_state, TRIAL_DAYS, get_gmina

router = APIRouter(prefix="/api/owner")
owner = require_roles("owner")

PLANS = {
    "mala": {"name": "Mała", "desc": "do 10 tys. mieszkańców", "month": 390.0, "year": 3900.0},
    "srednia": {"name": "Średnia", "desc": "10–50 tys. mieszkańców", "month": 790.0, "year": 7900.0},
    "duza": {"name": "Duża / miasto", "desc": "powyżej 50 tys. mieszkańców", "month": 1490.0, "year": 14900.0},
}


class GminaIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    plan: Literal["mala", "srednia", "duza"] = "mala"
    admin_email: str = Field(min_length=5, max_length=120)
    admin_first_name: str = Field(min_length=1, max_length=80)
    admin_last_name: str = Field(min_length=1, max_length=80)


class GminaPatch(BaseModel):
    plan: Optional[Literal["mala", "srednia", "duza"]] = None
    manual: Optional[Literal["on", "off", "auto"]] = None
    manual_until: Optional[datetime] = None


class AdminIn(BaseModel):
    email: str = Field(min_length=5, max_length=120)
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)


async def create_invited(gmina_id, role, first_name, last_name, email=None, pesel_h=None):
    code = make_code()
    u = {"id": new_id(), "role": role, "gmina_id": gmina_id, "email": email, "pesel_hash": pesel_h,
         "first_name": first_name.strip(), "last_name": last_name.strip(), "status": "invited",
         "activation_code_hash": hash_pw(code), "created_at": iso(now())}
    if not email:
        u.pop("email")
    if not pesel_h:
        u.pop("pesel_hash")
    await db.users.insert_one(u)
    return u, code


async def _gmina_row(g):
    tid = g["id"]
    return {
        **{k: g.get(k) for k in ("id", "name", "plan", "billing_cycle", "manual", "manual_until", "paid_until", "trial_until", "created_at")},
        "subscription": subscription_state(g),
        "trees": await db.trees.count_documents({"gmina_id": tid}),
        "users": await db.users.count_documents({"gmina_id": tid}),
        "admins": await db.users.find({"gmina_id": tid, "role": "gmina_admin"}, {"_id": 0, "id": 1, "email": 1, "first_name": 1, "last_name": 1, "status": 1}).to_list(50),
    }


@router.get("/plans")
async def plans(_: dict = Depends(owner)):
    return PLANS


@router.get("/gminas")
async def list_gminas(_: dict = Depends(owner)):
    gs = await db.gminas.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [await _gmina_row(g) for g in gs]


@router.post("/gminas")
async def create_gmina(body: GminaIn, _: dict = Depends(owner)):
    email = body.admin_email.strip().lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "Użytkownik z tym e-mailem już istnieje")
    g = {"id": new_id(), "name": body.name.strip(), "plan": body.plan, "billing_cycle": None, "manual": None,
         "manual_until": None, "paid_until": None, "trial_until": iso(now() + timedelta(days=TRIAL_DAYS)),
         "created_at": iso(now())}
    await db.gminas.insert_one(g)
    _, code = await create_invited(g["id"], "gmina_admin", body.admin_first_name, body.admin_last_name, email=email)
    g.pop("_id", None)
    return {"gmina": await _gmina_row(g), "admin_login": email, "activation_code": code}


@router.patch("/gminas/{gid}")
async def patch_gmina(gid: str, body: GminaPatch, _: dict = Depends(owner)):
    await get_gmina(gid)
    upd = {}
    if body.plan:
        upd["plan"] = body.plan
    if body.manual:
        upd["manual"] = None if body.manual == "auto" else body.manual
        upd["manual_until"] = iso(body.manual_until if body.manual_until.tzinfo else body.manual_until.replace(tzinfo=timezone.utc)) if body.manual == "on" and body.manual_until else None
    if upd:
        await db.gminas.update_one({"id": gid}, {"$set": upd})
    return await _gmina_row(await get_gmina(gid))


@router.post("/gminas/{gid}/admins")
async def add_admin(gid: str, body: AdminIn, _: dict = Depends(owner)):
    await get_gmina(gid)
    email = body.email.strip().lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "Użytkownik z tym e-mailem już istnieje")
    _, code = await create_invited(gid, "gmina_admin", body.first_name, body.last_name, email=email)
    return {"admin_login": email, "activation_code": code}


@router.post("/users/{uid}/reset")
async def reset_admin(uid: str, _: dict = Depends(owner)):
    u = await db.users.find_one({"id": uid, "role": "gmina_admin"}, {"_id": 0})
    if not u:
        raise HTTPException(404, "Nie znaleziono")
    code = make_code()
    await db.users.update_one({"id": uid}, {"$set": {"activation_code_hash": hash_pw(code)}})
    return {"admin_login": u["email"], "activation_code": code}
