import os
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from typing import Literal
from pydantic import BaseModel, Field
from typing import Optional
from core import (db, now, iso, parse_dt, new_id, valid_pesel, pesel_hash, hash_pw, check_pw, make_token, set_session_cookie, COOKIE,
                  current_user, public_user, subscription_state)

router = APIRouter(prefix="/api")
MAX_FAILS, LOCK_MIN = 5, 15


class LoginIn(BaseModel):
    login: str
    password: str


class RegisterIn(BaseModel):
    gmina_id: str
    pesel: str
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    address: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=8, max_length=128)


class ActivateIn(BaseModel):
    login: str
    code: str
    password: str = Field(min_length=8, max_length=128)


def _lookup(login: str):
    login = login.strip()
    if login.isdigit():
        return {"pesel_hash": pesel_hash(login)}
    return {"email": login.lower()}


async def _session(u, response: Response):
    token = make_token(u["id"])
    set_session_cookie(response, token)
    return {"token": token, "user": public_user(u)}


class DemoIn(BaseModel):
    role: Literal["gmina_admin", "worker", "resident"]


@router.get("/auth/demo")
async def demo_enabled():
    return {"enabled": os.environ.get("DEMO_LOGIN_ENABLED") == "true"}


@router.post("/auth/demo")
async def demo_login(body: DemoIn, response: Response):
    if os.environ.get("DEMO_LOGIN_ENABLED") != "true":
        raise HTTPException(404, "Konta demo są wyłączone")
    u = await db.users.find_one({"demo_role": body.role, "status": "active"}, {"_id": 0})
    if not u:
        raise HTTPException(404, "Brak konta demo")
    return await _session(u, response)


@router.post("/auth/logout")
async def logout(request: Request, response: Response):
    if request.headers.get("x-requested-with") != "arbix":
        raise HTTPException(403, "Nieprawidłowe żądanie")
    response.delete_cookie(COOKIE, path="/", secure=True, httponly=True, samesite="lax")
    return {"ok": True}


@router.get("/public/gminas")
async def list_gminas():
    gs = await db.gminas.find({}, {"_id": 0, "id": 1, "name": 1}).sort("name", 1).to_list(1000)
    return gs


@router.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "")).split(",")[0].strip()
    key = f"{ip}|{body.login.strip().lower()}"
    att = await db.login_attempts.find_one({"key": key}, {"_id": 0})
    if att and att.get("locked_until") and parse_dt(att["locked_until"]) > now():
        raise HTTPException(429, "Zbyt wiele prób. Spróbuj ponownie za 15 minut.")
    u = await db.users.find_one(_lookup(body.login), {"_id": 0})
    if not u or not u.get("password_hash") or not check_pw(body.password, u["password_hash"]):
        fails = (att or {}).get("fails", 0) + 1
        upd = {"fails": fails}
        if fails >= MAX_FAILS:
            upd = {"fails": 0, "locked_until": iso(now() + timedelta(minutes=LOCK_MIN))}
        await db.login_attempts.update_one({"key": key}, {"$set": upd}, upsert=True)
        raise HTTPException(401, "Nieprawidłowy login lub hasło")
    if u.get("status") == "rejected":
        raise HTTPException(403, "Rejestracja została odrzucona przez gminę")
    if u.get("status") == "disabled":
        raise HTTPException(403, "Konto zostało wyłączone")
    await db.login_attempts.delete_one({"key": key})
    return await _session(u, response)


@router.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    pesel = body.pesel.strip()
    if not valid_pesel(pesel):
        raise HTTPException(400, "Nieprawidłowy numer PESEL")
    g = await db.gminas.find_one({"id": body.gmina_id}, {"_id": 0})
    if not g:
        raise HTTPException(404, "Nie znaleziono gminy")
    ph = pesel_hash(pesel)
    if await db.users.find_one({"pesel_hash": ph}):
        raise HTTPException(409, "Konto z tym numerem PESEL już istnieje")
    in_list = await db.pesel_list.find_one({"gmina_id": g["id"], "pesel_hash": ph})
    u = {
        "id": new_id(), "role": "resident", "gmina_id": g["id"], "pesel_hash": ph,
        "first_name": body.first_name.strip(), "last_name": body.last_name.strip(), "address": body.address.strip(),
        "password_hash": hash_pw(body.password), "status": "active" if in_list else "pending",
        "created_at": iso(now()),
    }
    await db.users.insert_one(u)
    u.pop("_id", None)
    return await _session(u, response)


@router.post("/auth/activate")
async def activate(body: ActivateIn, response: Response):
    u = await db.users.find_one(_lookup(body.login), {"_id": 0})
    if not u or not u.get("activation_code_hash") or not check_pw(body.code.strip().upper(), u["activation_code_hash"]):
        raise HTTPException(401, "Nieprawidłowy login lub kod aktywacyjny")
    upd = {"password_hash": hash_pw(body.password), "activation_code_hash": None}
    if u.get("status") == "invited":
        upd["status"] = "active"
    await db.users.update_one({"id": u["id"]}, {"$set": upd})
    u.update(upd)
    return await _session(u, response)


@router.get("/auth/me")
async def me(u: dict = Depends(current_user)):
    out = {"user": public_user(u), "gmina": None}
    if u.get("gmina_id"):
        g = await db.gminas.find_one({"id": u["gmina_id"]}, {"_id": 0})
        if g:
            out["gmina"] = {"id": g["id"], "name": g["name"], "plan": g.get("plan"), "billing_cycle": g.get("billing_cycle"),
                            "subscription": subscription_state(g)}
    return out
