import csv
import io
import re
import zipfile
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
import qrcode
from PIL import Image, ImageDraw, ImageFont
from openpyxl import load_workbook
from core import (db, now, iso, new_id, token_urlsafe, valid_pesel, pesel_hash, hash_pw, make_code,
                  require_roles, public_user, subscription_state, get_gmina)
from routes_owner import create_invited, PLANS
from storage import save_upload

router = APIRouter(prefix="/api/gmina")
admin = require_roles("gmina_admin")
CONDITIONS = ("good", "attention", "danger", "removed")


class ParkIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field("", max_length=500)


class TreeIn(BaseModel):
    tag_number: str = Field(min_length=1, max_length=40)
    species: str = Field(min_length=1, max_length=120)
    species_latin: str = Field("", max_length=120)
    park_id: str
    location_desc: str = Field("", max_length=300)
    lat: Optional[float] = None
    lng: Optional[float] = None
    planted_year: Optional[int] = Field(None, ge=1500, le=2100)
    circumference_cm: Optional[float] = Field(None, ge=0, le=5000)
    height_m: Optional[float] = Field(None, ge=0, le=150)
    condition: Literal["good", "attention", "danger", "removed"] = "good"
    description: str = Field("", max_length=2000)
    history: str = Field("", max_length=5000)
    is_monument: bool = False
    monument_name: str = Field("", max_length=120)
    monument_decision: str = Field("", max_length=200)
    monument_date: str = Field("", max_length=20)
    wiki_title: str = Field("", max_length=200)


def _tree_data(body):
    d = {**body.model_dump(), "tag_number": body.tag_number.strip()}
    if not d["is_monument"]:
        d.update(monument_name="", monument_decision="", monument_date="")
    return d


class WorkerIn(BaseModel):
    pesel: str
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)


class StatusIn(BaseModel):
    status: Literal["active", "rejected", "disabled"]


@router.get("/overview")
async def overview(u: dict = Depends(admin)):
    gid = u["gmina_id"]
    g = await get_gmina(gid)
    q = {"gmina_id": gid}
    return {
        "gmina": {"id": g["id"], "name": g["name"], "plan": g.get("plan"), "billing_cycle": g.get("billing_cycle"),
                  "subscription": subscription_state(g), "plan_info": PLANS.get(g.get("plan"))},
        "trees": await db.trees.count_documents(q),
        "parks": await db.parks.count_documents(q),
        "workers": await db.users.count_documents({**q, "role": "worker"}),
        "residents": await db.users.count_documents({**q, "role": "resident", "status": "active"}),
        "pending": await db.users.count_documents({**q, "role": "resident", "status": "pending"}),
        "pesel_list": await db.pesel_list.count_documents(q),
        "open_reports": await db.reports.count_documents({**q, "status": {"$in": ["new", "in_progress"]}}),
        "danger_trees": await db.trees.count_documents({**q, "condition": "danger"}),
    }


# Parks
@router.get("/parks")
async def parks(u: dict = Depends(require_roles("gmina_admin", "worker"))):
    ps = await db.parks.find({"gmina_id": u["gmina_id"]}, {"_id": 0}).sort("name", 1).to_list(1000)
    for p in ps:
        p["tree_count"] = await db.trees.count_documents({"park_id": p["id"]})
    return ps


@router.post("/parks")
async def add_park(body: ParkIn, u: dict = Depends(admin)):
    p = {"id": new_id(), "gmina_id": u["gmina_id"], "name": body.name.strip(), "description": body.description, "created_at": iso(now())}
    await db.parks.insert_one(p)
    p.pop("_id", None)
    return p


@router.put("/parks/{pid}")
async def edit_park(pid: str, body: ParkIn, u: dict = Depends(admin)):
    r = await db.parks.update_one({"id": pid, "gmina_id": u["gmina_id"]}, {"$set": body.model_dump()})
    if not r.matched_count:
        raise HTTPException(404, "Nie znaleziono")
    return {"ok": True}


@router.delete("/parks/{pid}")
async def del_park(pid: str, u: dict = Depends(admin)):
    if await db.trees.count_documents({"park_id": pid, "gmina_id": u["gmina_id"]}):
        raise HTTPException(409, "Park zawiera drzewa — najpierw je przenieś lub usuń")
    r = await db.parks.delete_one({"id": pid, "gmina_id": u["gmina_id"]})
    if not r.deleted_count:
        raise HTTPException(404, "Nie znaleziono")
    return {"ok": True}


# Trees
async def _check_park(pid, gid):
    if not await db.parks.find_one({"id": pid, "gmina_id": gid}):
        raise HTTPException(400, "Nieprawidłowy park")


@router.post("/trees")
async def add_tree(body: TreeIn, u: dict = Depends(admin)):
    gid = u["gmina_id"]
    await _check_park(body.park_id, gid)
    if await db.trees.find_one({"gmina_id": gid, "tag_number": body.tag_number.strip()}):
        raise HTTPException(409, "Drzewo z tym numerem tabliczki już istnieje")
    t = {**_tree_data(body), "id": new_id(), "gmina_id": gid,
         "public_token": token_urlsafe(), "worker_token": token_urlsafe(12), "photo_path": None,
         "created_at": iso(now()), "updated_at": iso(now())}
    await db.trees.insert_one(t)
    t.pop("_id", None)
    return t


@router.put("/trees/{tid}")
async def edit_tree(tid: str, body: TreeIn, u: dict = Depends(admin)):
    gid = u["gmina_id"]
    await _check_park(body.park_id, gid)
    dup = await db.trees.find_one({"gmina_id": gid, "tag_number": body.tag_number.strip(), "id": {"$ne": tid}})
    if dup:
        raise HTTPException(409, "Drzewo z tym numerem tabliczki już istnieje")
    r = await db.trees.update_one({"id": tid, "gmina_id": gid}, {"$set": {**_tree_data(body), "updated_at": iso(now())}})
    if not r.matched_count:
        raise HTTPException(404, "Nie znaleziono")
    return await db.trees.find_one({"id": tid}, {"_id": 0})


@router.delete("/trees/{tid}")
async def del_tree(tid: str, u: dict = Depends(admin)):
    t = await db.trees.find_one({"id": tid, "gmina_id": u["gmina_id"]}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Nie znaleziono")
    paths = [t["photo_path"]] if t.get("photo_path") else []
    for coll, fields in ((db.work_logs, ("photos_before", "photos_after")), (db.reports, ("photos",))):
        async for d in coll.find({"tree_id": tid}, {"_id": 0}):
            for f in fields:
                paths.extend(d.get(f) or [])
        await coll.delete_many({"tree_id": tid})
    if paths:
        await db.files.update_many({"storage_path": {"$in": paths}}, {"$set": {"is_deleted": True}})
    await db.trees.delete_one({"id": tid})
    return {"ok": True}


@router.post("/trees/{tid}/photo")
async def tree_photo(tid: str, file: UploadFile = File(...), u: dict = Depends(admin)):
    t = await db.trees.find_one({"id": tid, "gmina_id": u["gmina_id"]})
    if not t:
        raise HTTPException(404, "Nie znaleziono")
    path = await save_upload(file, u["gmina_id"], "trees", u["id"], public=True)
    await db.trees.update_one({"id": tid}, {"$set": {"photo_path": path}})
    return {"photo_path": path}


# QR codes
_FONT_PATHS = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]


def _font(size):
    for p in _FONT_PATHS:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


def _qr(data, px=520):
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=2)
    q.add_data(data)
    q.make(fit=True)
    return q.make_image(fill_color="black", back_color="white").convert("RGB").resize((px, px), Image.NEAREST)


def tree_qr_png(tree, origin, gmina_name):
    w, h = 760, 900
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    img.paste(_qr(f"{origin}/t/{tree['public_token']}", 640), (60, 40))
    d.text((w // 2, 720), f"Nr tabliczki: {tree['tag_number']}", fill="black", font=_font(42), anchor="mm")
    d.text((w // 2, 780), f"{tree.get('species', '')} · {gmina_name}", fill="#444444", font=_font(26), anchor="mm")
    d.text((w // 2, 840), "Zeskanuj telefonem — ARBIX", fill="#2D6A4F", font=_font(26), anchor="mm")
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


def _origin(origin):
    if not re.match(r"^https?://[\w.\-:]+$", origin or ""):
        raise HTTPException(400, "Nieprawidłowy adres")
    return origin.rstrip("/")


def _safe(s):
    return re.sub(r"[^\w\-]+", "_", s)


@router.get("/trees/{tid}/qr")
async def tree_qr(tid: str, origin: str = Query(...), u: dict = Depends(admin)):
    t = await db.trees.find_one({"id": tid, "gmina_id": u["gmina_id"]}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Nie znaleziono")
    g = await get_gmina(u["gmina_id"])
    return Response(tree_qr_png(t, _origin(origin), g["name"]), media_type="image/png",
                    headers={"Content-Disposition": f'attachment; filename="arbix_{_safe(t["tag_number"])}.png"'})


@router.get("/qr-batch")
async def qr_batch(origin: str = Query(...), park_id: Optional[str] = None, u: dict = Depends(admin)):
    q = {"gmina_id": u["gmina_id"]}
    if park_id:
        q["park_id"] = park_id
    trees = await db.trees.find(q, {"_id": 0}).to_list(5000)
    if not trees:
        raise HTTPException(404, "Brak drzew")
    g = await get_gmina(u["gmina_id"])
    o = _origin(origin)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        lines = ["nr_tabliczki;gatunek;link"]
        for t in trees:
            z.writestr(f"arbix_{_safe(t['tag_number'])}.png", tree_qr_png(t, o, g["name"]))
            lines.append(f"{t['tag_number']};{t['species']};{o}/t/{t['public_token']}")
        z.writestr("lista.csv", "\n".join(lines))
    return Response(buf.getvalue(), media_type="application/zip",
                    headers={"Content-Disposition": 'attachment; filename="arbix_qr.zip"'})


# Workers
@router.get("/workers")
async def workers(u: dict = Depends(admin)):
    ws = await db.users.find({"gmina_id": u["gmina_id"], "role": {"$in": ["worker", "gmina_admin"]}}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [public_user(w) for w in ws]


@router.post("/workers")
async def add_worker(body: WorkerIn, u: dict = Depends(admin)):
    p = body.pesel.strip()
    if not valid_pesel(p):
        raise HTTPException(400, "Nieprawidłowy numer PESEL")
    ph = pesel_hash(p)
    if await db.users.find_one({"pesel_hash": ph}):
        raise HTTPException(409, "Konto z tym numerem PESEL już istnieje")
    w, code = await create_invited(u["gmina_id"], "worker", body.first_name, body.last_name, pesel_h=ph)
    return {"user": public_user(w), "activation_code": code}


async def _reset(uid, gid, roles):
    t = await db.users.find_one({"id": uid, "gmina_id": gid, "role": {"$in": roles}}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Nie znaleziono")
    code = make_code()
    await db.users.update_one({"id": uid}, {"$set": {"activation_code_hash": hash_pw(code)}})
    return {"activation_code": code}


@router.post("/workers/{uid}/reset")
async def reset_worker(uid: str, u: dict = Depends(admin)):
    return await _reset(uid, u["gmina_id"], ["worker"])


@router.patch("/workers/{uid}")
async def worker_status(uid: str, body: StatusIn, u: dict = Depends(admin)):
    r = await db.users.update_one({"id": uid, "gmina_id": u["gmina_id"], "role": "worker"}, {"$set": {"status": body.status}})
    if not r.matched_count:
        raise HTTPException(404, "Nie znaleziono")
    return {"ok": True}


# Residents
@router.get("/residents")
async def residents(status: Optional[str] = None, u: dict = Depends(admin)):
    q = {"gmina_id": u["gmina_id"], "role": "resident"}
    if status:
        q["status"] = status
    rs = await db.users.find(q, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return [public_user(r) for r in rs]


@router.patch("/residents/{uid}")
async def resident_status(uid: str, body: StatusIn, u: dict = Depends(admin)):
    r = await db.users.update_one({"id": uid, "gmina_id": u["gmina_id"], "role": "resident"}, {"$set": {"status": body.status}})
    if not r.matched_count:
        raise HTTPException(404, "Nie znaleziono")
    return {"ok": True}


@router.post("/residents/{uid}/reset")
async def reset_resident(uid: str, u: dict = Depends(admin)):
    return await _reset(uid, u["gmina_id"], ["resident"])


def _extract_pesels(name, data):
    vals = []
    if name.lower().endswith((".xlsx", ".xlsm")):
        wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
        for ws in wb.worksheets:
            for row in ws.iter_rows(values_only=True):
                vals.extend(str(c) for c in row if c is not None)
    else:
        text = data.decode("utf-8-sig", errors="ignore")
        for row in csv.reader(io.StringIO(text), delimiter=";" if text.count(";") > text.count(",") else ","):
            vals.extend(row)
    out = set()
    for v in vals:
        v = v.strip().split(".")[0]
        if len(v) == 10 and v.isdigit():
            v = "0" + v
        out.add(v)
    return out


@router.post("/pesel-list")
async def upload_pesels(file: UploadFile = File(...), replace: bool = False, u: dict = Depends(admin)):
    gid = u["gmina_id"]
    data = await file.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(400, "Plik jest za duży")
    try:
        cands = _extract_pesels(file.filename or "", data)
    except Exception:
        raise HTTPException(400, "Nie udało się odczytać pliku (CSV lub XLSX)")
    valid = [p for p in cands if valid_pesel(p)]
    invalid = len([p for p in cands if p.isdigit() and len(p) == 11 and not valid_pesel(p)])
    if not valid:
        raise HTTPException(400, "W pliku nie znaleziono prawidłowych numerów PESEL")
    if replace:
        await db.pesel_list.delete_many({"gmina_id": gid})
    hashes = [pesel_hash(p) for p in valid]
    existing = {d["pesel_hash"] for d in await db.pesel_list.find({"gmina_id": gid, "pesel_hash": {"$in": hashes}}, {"_id": 0, "pesel_hash": 1}).to_list(len(hashes))}
    new = [{"gmina_id": gid, "pesel_hash": h} for h in hashes if h not in existing]
    if new:
        await db.pesel_list.insert_many(new)
    act = await db.users.update_many({"gmina_id": gid, "role": "resident", "status": "pending", "pesel_hash": {"$in": hashes}}, {"$set": {"status": "active"}})
    await db.pesel_uploads.insert_one({"gmina_id": gid, "filename": file.filename, "added": len(new), "at": iso(now())})
    return {"added": len(new), "already": len(existing), "invalid": invalid, "auto_activated": act.modified_count,
            "total": await db.pesel_list.count_documents({"gmina_id": gid})}
