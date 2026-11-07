import asyncio
import math
import os
import requests
import time
from pymongo import UpdateOne
from datetime import timedelta
from fastapi import APIRouter, HTTPException, Query
from starlette.concurrency import run_in_threadpool
from core import db, now, iso, subscription_state

router = APIRouter(prefix="/api/public")
CELL = 0.01
UA = {"User-Agent": "ARBIX/1.0 (tree registry for Polish gminas)"}
TTL = timedelta(days=30)
INFLIGHT = set()
DEAD = {}
SPECIES_TAGS = ("species:pl", "taxon:pl", "genus:pl", "species", "taxon", "genus")


def _mirrors():
    return [u.strip() for u in os.environ["OVERPASS_URLS"].split(",") if u.strip()]


def _cells(s, w, n, e):
    return [(i, j) for i in range(math.floor(s / CELL), math.floor(n / CELL) + 1)
            for j in range(math.floor(w / CELL), math.floor(e / CELL) + 1)]


def _overpass(s, w, n, e):
    q = f'[out:json][timeout:40];node["natural"="tree"]({s},{w},{n},{e});out body qt 8000;'
    for url in _mirrors():
        if DEAD.get(url, 0) > time.time():
            continue
        try:
            r = requests.post(url, data={"data": q}, headers=UA, timeout=(4, 45))
            if r.status_code == 200:
                return r.json().get("elements", [])
        except (requests.RequestException, ValueError):
            pass
        DEAD[url] = time.time() + 900
    return None


def _osm_api(s, w, n, e):
    try:
        r = requests.get("https://api.openstreetmap.org/api/0.6/map.json", params={"bbox": f"{w},{s},{e},{n}"}, headers=UA, timeout=(5, 60))
        if r.status_code != 200:
            return None
        return [x for x in r.json().get("elements", []) if x.get("type") == "node" and x.get("tags", {}).get("natural") == "tree"]
    except (requests.RequestException, ValueError):
        return None


async def _store(els, cells):
    ops = [UpdateOne({"osm_id": el["id"]}, {"$set": _tree_doc(el)}, upsert=True) for el in els if "lat" in el]
    for k in range(0, len(ops), 1000):
        await db.osm_trees.bulk_write(ops[k:k + 1000], ordered=False)
    for i, j in cells:
        await db.osm_cells.update_one({"key": f"{i}:{j}"}, {"$set": {"fetched_at": iso(now())}}, upsert=True)


def _tree_doc(el):
    tags = el.get("tags", {})
    species = next((tags[k] for k in SPECIES_TAGS if tags.get(k)), "")
    return {"osm_id": el["id"], "lat": el["lat"], "lng": el["lon"], "species": species,
            "name": tags.get("name", ""), "leaf_type": tags.get("leaf_type", ""),
            "height": tags.get("height", ""), "circumference": tags.get("circumference", ""),
            "denotation": tags.get("denotation", ""), "start_date": tags.get("start_date", "")}


async def _fetch(missing, key):
    try:
        s, n = min(i for i, _ in missing) * CELL, (max(i for i, _ in missing) + 1) * CELL
        w, e = min(j for _, j in missing) * CELL, (max(j for _, j in missing) + 1) * CELL
        els = await run_in_threadpool(_overpass, round(s, 5), round(w, 5), round(n, 5), round(e, 5))
        if els is not None:
            return await _store(els, missing)
        sem = asyncio.Semaphore(3)

        async def one(i, j):
            async with sem:
                els = await run_in_threadpool(_osm_api, round(i * CELL, 5), round(j * CELL, 5), round((i + 1) * CELL, 5), round((j + 1) * CELL, 5))
            if els is not None:
                await _store(els, [(i, j)])
        await asyncio.gather(*(one(i, j) for i, j in missing))
    finally:
        INFLIGHT.discard(key)


async def _ensure(cells):
    fresh = iso(now() - TTL)
    keys = [f"{i}:{j}" for i, j in cells]
    have = {c["key"] async for c in db.osm_cells.find({"key": {"$in": keys}, "fetched_at": {"$gte": fresh}}, {"key": 1})}
    missing = [c for c, k in zip(cells, keys) if k not in have]
    if not missing:
        return True
    key = ",".join(f"{i}:{j}" for i, j in missing)
    if key not in INFLIGHT:
        INFLIGHT.add(key)
        asyncio.create_task(_fetch(missing, key))
    return False


@router.get("/osm/trees")
async def osm_trees(s: float = Query(..., ge=49, le=55.5), w: float = Query(..., ge=14, le=24.5),
                    n: float = Query(..., ge=49, le=55.5), e: float = Query(..., ge=14, le=24.5)):
    if n <= s or e <= w or (n - s) > 0.04 or (e - w) > 0.06:
        raise HTTPException(400, "Przybliż mapę, aby zobaczyć drzewa")
    ok = await _ensure(_cells(s, w, n, e))
    trees = await db.osm_trees.find({"lat": {"$gte": s, "$lte": n}, "lng": {"$gte": w, "$lte": e}},
                                    {"_id": 0, "osm_id": 1, "lat": 1, "lng": 1, "species": 1, "name": 1}).to_list(8000)
    return {"complete": ok, "trees": trees}


def _reverse(lat, lng):
    try:
        r = requests.get("https://nominatim.openstreetmap.org/reverse", headers=UA, timeout=10,
                         params={"format": "jsonv2", "lat": lat, "lon": lng, "zoom": 10, "accept-language": "pl"})
        a = r.json().get("address", {}) if r.status_code == 200 else {}
    except (requests.RequestException, ValueError):
        return ""
    return a.get("city") or a.get("town") or a.get("municipality") or a.get("village") or a.get("county") or ""


@router.get("/osm/trees/{osm_id}")
async def osm_tree(osm_id: int):
    t = await db.osm_trees.find_one({"osm_id": osm_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Nie znaleziono drzewa")
    if "gmina" not in t:
        t["gmina"] = await run_in_threadpool(_reverse, t["lat"], t["lng"])
        if t["gmina"]:
            await db.osm_trees.update_one({"osm_id": osm_id}, {"$set": {"gmina": t["gmina"]}})
    return t


@router.get("/map/points")
async def map_points():
    gs = {g["id"]: g for g in await db.gminas.find({}, {"_id": 0}).to_list(5000) if subscription_state(g)["active"]}
    q = {"gmina_id": {"$in": list(gs)}, "lat": {"$ne": None}, "lng": {"$ne": None}}
    trees = await db.trees.find({**q, "condition": {"$ne": "removed"}},
                                {"_id": 0, "public_token": 1, "tag_number": 1, "species": 1, "species_latin": 1, "lat": 1, "lng": 1,
                                 "is_monument": 1, "monument_name": 1, "condition": 1, "photo_path": 1, "gmina_id": 1, "park_id": 1}).to_list(50000)
    places = await db.places.find(q, {"_id": 0, "id": 1, "name": 1, "category": 1, "lat": 1, "lng": 1, "photo_path": 1, "image_url": 1, "gmina_id": 1}).to_list(5000)
    parks = {p["id"]: p["name"] async for p in db.parks.find({"gmina_id": {"$in": list(gs)}}, {"_id": 0, "id": 1, "name": 1})}
    for x in trees + places:
        x["gmina_name"] = gs[x["gmina_id"]]["name"]
        x["park"] = parks.get(x.pop("park_id", None), "")
    return {"trees": trees, "places": places}
