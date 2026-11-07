import math
from datetime import timedelta
from typing import Optional, List, Literal
from urllib.parse import quote
import requests
from starlette.concurrency import run_in_threadpool
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
from core import (db, now, iso, new_id, staff_user, active_resident, require_roles, optional_user, current_user,
                  subscription_state, get_gmina)
from storage import save_upload, get_object

router = APIRouter(prefix="/api")
WORK_TYPES = ("inspection", "pruning", "treatment", "removal", "planting", "other")
REPORT_TYPES = ("broken_branch", "disease", "leaning", "damage", "other")
REPORT_STATUSES = ("new", "in_progress", "done", "rejected")


async def _park_name(pid):
    p = await db.parks.find_one({"id": pid}, {"_id": 0, "name": 1})
    return p["name"] if p else ""


# Public tree page
@router.get("/public/trees/{token}")
async def public_tree(token: str, u: Optional[dict] = Depends(optional_user)):
    t = await db.trees.find_one({"public_token": token}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Nie znaleziono drzewa")
    g = await get_gmina(t["gmina_id"])
    sub = subscription_state(g)
    base = {"tag_number": t["tag_number"], "species": t["species"], "species_latin": t.get("species_latin", ""),
            "park": await _park_name(t["park_id"]), "gmina": {"id": g["id"], "name": g["name"]}, "service_active": sub["active"]}
    if sub["active"]:
        base.update({k: t.get(k) for k in ("location_desc", "lat", "lng", "planted_year", "circumference_cm", "height_m", "condition", "photo_path", "description",
                                          "history", "is_monument", "monument_name", "monument_decision", "monument_date", "wiki_title")})
        base["works_count"] = await db.work_logs.count_documents({"tree_id": t["id"]})
        last = await db.work_logs.find({"tree_id": t["id"]}, {"_id": 0, "date": 1, "type": 1}).sort("date", -1).to_list(1)
        base["last_work"] = last[0] if last else None
    can_report, reason = False, "login"
    if u:
        if u["role"] != "resident":
            reason = "not_resident"
        elif u["gmina_id"] != t["gmina_id"]:
            reason = "other_gmina"
        elif u.get("status") != "active":
            reason = "pending"
        elif not sub["active"]:
            reason = "inactive"
        else:
            can_report, reason = True, None
    elif not sub["active"]:
        reason = "inactive"
    base["can_report"], base["report_block_reason"] = can_report, reason
    base["is_staff"] = bool(u and u["role"] in ("worker", "gmina_admin") and u["gmina_id"] == t["gmina_id"])
    base["staff_tree_id"] = t["id"] if base["is_staff"] else None
    return base


MAP_FIELDS = ("public_token", "tag_number", "species", "species_latin", "park_id", "lat", "lng", "is_monument", "monument_name")


@router.get("/public/gminas/{gid}/map")
async def public_map(gid: str):
    g = await get_gmina(gid)
    active = subscription_state(g)["active"]
    fields = MAP_FIELDS + (("condition", "photo_path", "location_desc", "planted_year") if active else ())
    trees = await db.trees.find({"gmina_id": gid, "condition": {"$ne": "removed"}}, {"_id": 0, **{f: 1 for f in fields}}).sort("tag_number", 1).to_list(5000)
    parks = await db.parks.find({"gmina_id": gid}, {"_id": 0, "id": 1, "name": 1, "description": 1}).sort("name", 1).to_list(1000)
    return {"gmina": {"id": g["id"], "name": g["name"]}, "service_active": active, "parks": parks, "trees": trees}


@router.get("/public/wiki")
async def wiki(title: str = Query(..., min_length=2, max_length=200)):
    key = title.strip().lower()
    cached = await db.wiki_cache.find_one({"key": key}, {"_id": 0})
    if cached and cached.get("at", "") > iso(now() - timedelta(days=7)):
        return cached["data"]
    data = {"found": False}
    try:
        r = await run_in_threadpool(lambda: requests.get(f"https://pl.wikipedia.org/api/rest_v1/page/summary/{quote(title.strip().replace(' ', '_'))}",
                                                         headers={"User-Agent": "ARBIX/1.0 (https://arbotag.pl)"}, timeout=8))
        if r.status_code not in (200, 404):
            return data
        if r.status_code == 200:
            j = r.json()
            if j.get("type") == "standard" and j.get("extract"):
                data = {"found": True, "title": j.get("title"), "extract": j.get("extract"),
                        "url": ((j.get("content_urls") or {}).get("desktop") or {}).get("page")}
    except Exception:
        return data
    await db.wiki_cache.update_one({"key": key}, {"$set": {"key": key, "data": data, "at": iso(now())}}, upsert=True)
    return data


# Staff (worker + gmina admin)
@router.get("/staff/trees")
async def staff_trees(q: str = "", park_id: Optional[str] = None, condition: Optional[str] = None, u: dict = Depends(staff_user)):
    f = {"gmina_id": u["gmina_id"]}
    if park_id:
        f["park_id"] = park_id
    if condition:
        f["condition"] = condition
    if q:
        import re
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        f["$or"] = [{"tag_number": rx}, {"species": rx}, {"species_latin": rx}, {"location_desc": rx}]
    trees = await db.trees.find(f, {"_id": 0}).sort("tag_number", 1).to_list(5000)
    parks = {p["id"]: p["name"] for p in await db.parks.find({"gmina_id": u["gmina_id"]}, {"_id": 0}).to_list(1000)}
    for t in trees:
        t["park"] = parks.get(t["park_id"], "")
        t["open_reports"] = await db.reports.count_documents({"tree_id": t["id"], "status": {"$in": ["new", "in_progress"]}})
        if u["role"] != "gmina_admin":
            t.pop("public_token", None)
            t.pop("worker_token", None)
    return trees


@router.get("/staff/trees/{key}")
async def staff_tree(key: str, u: dict = Depends(staff_user)):
    t = await db.trees.find_one({"gmina_id": u["gmina_id"], "$or": [{"id": key}, {"worker_token": key}]}, {"_id": 0})
    if not t:
        other = await db.trees.find_one({"worker_token": key}, {"_id": 0, "gmina_id": 1})
        raise HTTPException(403 if other else 404, "To drzewo należy do innej gminy" if other else "Nie znaleziono drzewa")
    t["park"] = await _park_name(t["park_id"])
    logs = await db.work_logs.find({"tree_id": t["id"]}, {"_id": 0}).sort([("date", -1), ("created_at", -1)]).to_list(500)
    reports = await db.reports.find({"tree_id": t["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    if u["role"] != "gmina_admin":
        t.pop("worker_token", None)
    return {"tree": t, "logs": logs, "reports": reports}


@router.post("/staff/trees/{tid}/logs")
async def add_log(tid: str, date: str = Form(...), type: str = Form(...), description: str = Form(""),
                  new_condition: str = Form(""), report_id: str = Form(""),
                  photos_before: List[UploadFile] = File(default=[]), photos_after: List[UploadFile] = File(default=[]),
                  u: dict = Depends(staff_user)):
    t = await db.trees.find_one({"id": tid, "gmina_id": u["gmina_id"]}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Nie znaleziono drzewa")
    if type not in WORK_TYPES:
        raise HTTPException(400, "Nieprawidłowy rodzaj pracy")
    try:
        from datetime import date as _d
        _d.fromisoformat(date[:10])
    except ValueError:
        raise HTTPException(400, "Nieprawidłowa data")
    if new_condition and new_condition not in ("good", "attention", "danger", "removed"):
        raise HTTPException(400, "Nieprawidłowy stan")
    if len(photos_before) + len(photos_after) > 5:
        raise HTTPException(400, "Maksymalnie 5 zdjęć")
    if len(description) > 3000:
        raise HTTPException(400, "Opis jest za długi")
    before = [await save_upload(f, u["gmina_id"], "works", u["id"]) for f in photos_before if f.filename]
    after = [await save_upload(f, u["gmina_id"], "works", u["id"]) for f in photos_after if f.filename]
    log = {"id": new_id(), "tree_id": tid, "gmina_id": u["gmina_id"], "date": date[:10], "type": type,
           "description": description.strip(), "performer_id": u["id"],
           "performer_name": f"{u.get('first_name', '')} {u.get('last_name', '')}".strip(),
           "photos_before": before, "photos_after": after, "condition_after": new_condition or None,
           "report_id": report_id or None, "created_at": iso(now())}
    await db.work_logs.insert_one(log)
    log.pop("_id", None)
    if new_condition:
        await db.trees.update_one({"id": tid}, {"$set": {"condition": new_condition, "updated_at": iso(now())}})
    if report_id:
        await db.reports.update_one({"id": report_id, "tree_id": tid}, {"$set": {"status": "done", "updated_at": iso(now()), "handled_by": log["performer_name"]}})
    return log


@router.get("/staff/reports")
async def staff_reports(status: Optional[str] = None, u: dict = Depends(staff_user)):
    f = {"gmina_id": u["gmina_id"]}
    if status == "open":
        f["status"] = {"$in": ["new", "in_progress"]}
    elif status:
        f["status"] = status
    rs = await db.reports.find(f, {"_id": 0}).sort("created_at", -1).to_list(2000)
    trees = {t["id"]: t for t in await db.trees.find({"gmina_id": u["gmina_id"]}, {"_id": 0, "id": 1, "tag_number": 1, "species": 1}).to_list(5000)}
    for r in rs:
        t = trees.get(r.get("tree_id"), {})
        r["tree_tag"], r["tree_species"] = t.get("tag_number", ""), t.get("species", "") or r.get("osm_species", "")
    return rs


class ReportPatch(BaseModel):
    status: Literal["new", "in_progress", "done", "rejected"]
    staff_note: str = Field("", max_length=1000)


@router.patch("/staff/reports/{rid}")
async def patch_report(rid: str, body: ReportPatch, u: dict = Depends(staff_user)):
    name = f"{u.get('first_name', '')} {u.get('last_name', '')}".strip()
    r = await db.reports.update_one({"id": rid, "gmina_id": u["gmina_id"]},
                                    {"$set": {"status": body.status, "staff_note": body.staff_note, "handled_by": name, "updated_at": iso(now())}})
    if not r.matched_count:
        raise HTTPException(404, "Nie znaleziono")
    return await db.reports.find_one({"id": rid}, {"_id": 0})


# Residents
async def _near_gmina(gid, lat, lng, km=10):
    q = {"gmina_id": gid, "lat": {"$ne": None}, "lng": {"$ne": None}}
    pts = await db.trees.find(q, {"_id": 0, "lat": 1, "lng": 1}).to_list(20000)
    pts += await db.places.find(q, {"_id": 0, "lat": 1, "lng": 1}).to_list(2000)
    if not pts:
        return True
    d = km / 111.0
    return any(abs(p["lat"] - lat) < d and abs(p["lng"] - lng) < d / max(math.cos(math.radians(lat)), 0.2) for p in pts)


async def _tree_target(token, gid):
    t = await db.trees.find_one({"public_token": token}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Nie znaleziono drzewa")
    if t["gmina_id"] != gid:
        raise HTTPException(403, "Możesz zgłaszać problemy tylko w swojej gminie")
    return {"tree_id": t["id"], "lat": t.get("lat"), "lng": t.get("lng")}


async def _osm_target(osm_id):
    o = await db.osm_trees.find_one({"osm_id": osm_id}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Nie znaleziono drzewa")
    return {"osm_id": osm_id, "lat": o["lat"], "lng": o["lng"], "osm_species": o.get("species", "")}


async def _report_target(tree_token, osm_id, lat, lng, gid):
    base = {"tree_id": None, "osm_id": None, "lat": None, "lng": None, "osm_species": ""}
    if tree_token:
        return {**base, **await _tree_target(tree_token, gid)}
    if osm_id is not None:
        target = {**base, **await _osm_target(osm_id)}
    elif lat is not None and lng is not None:
        target = {**base, "lat": lat, "lng": lng}
    else:
        raise HTTPException(400, "Wskaż drzewo lub miejsce zdarzenia")
    if not await _near_gmina(gid, target["lat"], target["lng"]):
        raise HTTPException(403, "To miejsce leży poza Twoją gminą. Możesz zgłaszać zdarzenia tylko w swojej gminie.")
    return target


def _validate_report(type, comment, photos):
    if type not in REPORT_TYPES:
        raise HTTPException(400, "Nieprawidłowy rodzaj problemu")
    photos = [p for p in photos if p.filename]
    if not 1 <= len(photos) <= 3:
        raise HTTPException(400, "Dodaj od 1 do 3 zdjęć")
    if len(comment) > 2000:
        raise HTTPException(400, "Komentarz jest za długi")
    return photos


@router.post("/resident/reports")
async def create_report(tree_token: str = Form(""), osm_id: Optional[int] = Form(None), lat: Optional[float] = Form(None, ge=-90, le=90),
                        lng: Optional[float] = Form(None, ge=-180, le=180), type: str = Form(...), comment: str = Form(""),
                        photos: List[UploadFile] = File(default=[]), u: dict = Depends(active_resident)):
    extra = await _report_target(tree_token, osm_id, lat, lng, u["gmina_id"])
    photos = _validate_report(type, comment, photos)
    paths = [await save_upload(p, u["gmina_id"], "reports", u["id"]) for p in photos]
    r = {"id": new_id(), **extra, "gmina_id": u["gmina_id"], "resident_id": u["id"],
         "resident_name": f"{u['first_name']} {u['last_name']}", "type": type, "comment": comment.strip(),
         "photos": paths, "status": "new", "staff_note": "", "created_at": iso(now()), "updated_at": iso(now())}
    await db.reports.insert_one(r)
    r.pop("_id", None)
    return r


@router.get("/resident/reports")
async def my_reports(u: dict = Depends(require_roles("resident"))):
    rs = await db.reports.find({"resident_id": u["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for r in rs:
        t = await db.trees.find_one({"id": r["tree_id"]}, {"_id": 0, "tag_number": 1, "species": 1, "public_token": 1}) if r.get("tree_id") else None
        r["tree"] = t or {}
    return rs


# Files
@router.get("/files/{path:path}")
async def get_file(path: str, u: Optional[dict] = Depends(optional_user)):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "Nie znaleziono pliku")
    if not rec.get("public"):
        if not u:
            raise HTTPException(401, "Nie zalogowano")
        ok = u["role"] == "owner" or (u["gmina_id"] == rec["gmina_id"] and (u["role"] in ("worker", "gmina_admin") or rec["owner_id"] == u["id"]))
        if not ok:
            raise HTTPException(403, "Brak dostępu")
    data, ct = get_object(path)
    return Response(content=data, media_type=rec.get("content_type", ct), headers={"Cache-Control": "private, max-age=86400"})
