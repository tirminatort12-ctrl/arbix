import os
import hmac
import hashlib
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
JWT_SECRET = os.environ["JWT_SECRET"]
TRIAL_DAYS = 14


def now():
    return datetime.now(timezone.utc)


def iso(dt):
    return dt.isoformat() if dt else None


def parse_dt(v):
    if not v:
        return None
    try:
        d = datetime.fromisoformat(v)
    except (TypeError, ValueError):
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def new_id():
    return str(uuid.uuid4())


def token_urlsafe(n=9):
    return secrets.token_urlsafe(n)


def valid_pesel(p: str) -> bool:
    if not p or len(p) != 11 or not p.isdigit():
        return False
    w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]
    s = sum(int(p[i]) * w[i] for i in range(10))
    return (10 - s % 10) % 10 == int(p[10])


def pesel_hash(p: str) -> str:
    return hmac.new(JWT_SECRET.encode(), p.encode(), hashlib.sha256).hexdigest()


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def check_pw(pw: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), h.encode())
    except Exception:
        return False


def make_code():
    return "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(8))


def make_token(user_id: str) -> str:
    return jwt.encode({"sub": user_id, "exp": now() + timedelta(days=30)}, JWT_SECRET, algorithm="HS256")


def subscription_state(g: dict) -> dict:
    n = now()
    manual = g.get("manual")
    paid_until = parse_dt(g.get("paid_until"))
    trial_until = parse_dt(g.get("trial_until"))
    manual_until = parse_dt(g.get("manual_until"))
    if manual == "off":
        status, until = "disabled", None
    elif manual == "on" and (not manual_until or manual_until > n):
        status, until = "manual", manual_until
    elif paid_until and paid_until > n:
        status, until = "card", paid_until
    elif trial_until and trial_until > n:
        status, until = "trial", trial_until
    else:
        status, until = "expired", None
    return {"status": status, "active": status in ("manual", "card", "trial"), "until": iso(until)}


def public_user(u: dict) -> dict:
    return {
        "id": u["id"], "role": u["role"], "gmina_id": u.get("gmina_id"),
        "first_name": u.get("first_name", ""), "last_name": u.get("last_name", ""),
        "email": u.get("email"), "status": u.get("status"), "address": u.get("address", ""),
        "created_at": u.get("created_at"),
    }


async def get_user_from_token(token: str):
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    u = await db.users.find_one({"id": data["sub"]}, {"_id": 0})
    if not u or u.get("status") in ("rejected", "disabled", "invited"):
        return None
    return u


COOKIE = "arbix_session"
SAFE_METHODS = ("GET", "HEAD", "OPTIONS")


def _request_token(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:]
    token = request.cookies.get(COOKIE, "")
    # Cookie sessions must send the app header on writes (CSRF guard on top of SameSite=Lax).
    if token and request.method not in SAFE_METHODS and request.headers.get("x-requested-with") != "arbix":
        raise HTTPException(403, "Nieprawidłowe żądanie")
    return token


def set_session_cookie(response, token: str):
    response.set_cookie(COOKIE, token, max_age=30 * 86400, httponly=True, secure=True, samesite="lax", path="/")


async def current_user(request: Request) -> dict:
    token = _request_token(request)
    if not token:
        raise HTTPException(401, "Nie zalogowano")
    u = await get_user_from_token(token)
    if not u:
        raise HTTPException(401, "Sesja wygasła")
    return u


async def optional_user(request: Request):
    token = _request_token(request)
    return await get_user_from_token(token) if token else None


def require_roles(*roles):
    async def dep(u: dict = Depends(current_user)):
        if u["role"] not in roles:
            raise HTTPException(403, "Brak uprawnień")
        return u
    return dep


async def get_gmina(gid: str) -> dict:
    g = await db.gminas.find_one({"id": gid}, {"_id": 0})
    if not g:
        raise HTTPException(404, "Nie znaleziono gminy")
    return g


async def require_active(gid: str):
    g = await get_gmina(gid)
    if not subscription_state(g)["active"]:
        raise HTTPException(402, "Serwis tymczasowo niedostępny")
    return g


async def staff_user(u: dict = Depends(require_roles("worker", "gmina_admin"))):
    if u["role"] == "worker":
        await require_active(u["gmina_id"])
    return u


async def active_resident(u: dict = Depends(require_roles("resident"))):
    if u.get("status") != "active":
        raise HTTPException(403, "Konto oczekuje na zatwierdzenie przez gminę")
    await require_active(u["gmina_id"])
    return u
