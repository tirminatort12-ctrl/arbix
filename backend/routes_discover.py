import math
import re
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from core import db, subscription_state

router = APIRouter(prefix="/api/public")


async def _active_gminas():
    gs = await db.gminas.find({}, {"_id": 0}).to_list(5000)
    return {g["id"]: g for g in gs if subscription_state(g)["active"]}


def _km(a_lat, a_lng, b_lat, b_lng):
    r = math.radians
    h = math.sin(r(b_lat - a_lat) / 2) ** 2 + math.cos(r(a_lat)) * math.cos(r(b_lat)) * math.sin(r(b_lng - a_lng) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


async def _park_cards(gminas, park_filter=None):
    q = {"gmina_id": {"$in": list(gminas)}}
    parks = await db.parks.find({**q, **(park_filter or {})}, {"_id": 0}).to_list(5000)
    if not parks:
        return []
    pids = [p["id"] for p in parks]
    trees = await db.trees.find({"park_id": {"$in": pids}, "condition": {"$ne": "removed"}},
                                {"_id": 0, "park_id": 1, "lat": 1, "lng": 1, "is_monument": 1, "photo_path": 1}).to_list(50000)
    places = await db.places.find({"park_id": {"$in": pids}}, {"_id": 0, "park_id": 1, "lat": 1, "lng": 1, "photo_path": 1, "image_url": 1}).to_list(5000)
    stats = {pid: {"trees": 0, "monuments": 0, "places": 0, "pts": [], "photo_path": None, "image_url": None} for pid in pids}
    for t in trees:
        _tally_tree(stats[t["park_id"]], t)
    for p in places:
        _tally_place(stats[p["park_id"]], p)
    return [_card(p, stats[p["id"]], gminas) for p in parks]


def _point(x):
    return (x["lat"], x["lng"]) if x.get("lat") is not None and x.get("lng") is not None else None


def _tally_tree(s, t):
    s["trees"] += 1
    if t.get("is_monument"):
        s["monuments"] += 1
        if t.get("photo_path") and not s["photo_path"]:
            s["photo_path"] = t["photo_path"]
    if _point(t):
        s["pts"].append(_point(t))


def _tally_place(s, p):
    s["places"] += 1
    if _point(p):
        s["pts"].append(_point(p))
    if not s["photo_path"] and not s["image_url"]:
        s["photo_path"], s["image_url"] = p.get("photo_path"), p.get("image_url")


def _card(park, s, gminas):
    pts = s.pop("pts")
    lat = sum(x for x, _ in pts) / len(pts) if pts else None
    lng = sum(y for _, y in pts) / len(pts) if pts else None
    return {**park, **s, "gmina_name": gminas[park["gmina_id"]]["name"], "lat": lat, "lng": lng,
            "score": s["trees"] + 3 * s["places"] + 5 * s["monuments"]}


@router.get("/parks")
async def parks(lat: Optional[float] = Query(None, ge=-90, le=90), lng: Optional[float] = Query(None, ge=-180, le=180),
                limit: int = Query(12, ge=1, le=50)):
    cards = await _park_cards(await _active_gminas())
    if lat is not None and lng is not None:
        near = [c for c in cards if c["lat"] is not None]
        for c in near:
            c["distance_km"] = round(_km(lat, lng, c["lat"], c["lng"]), 1)
        return sorted(near, key=lambda c: c["distance_km"])[:limit]
    return sorted(cards, key=lambda c: -c["score"])[:limit]


@router.get("/parks/{pid}")
async def park(pid: str):
    gminas = await _active_gminas()
    cards = await _park_cards(gminas, {"id": pid})
    if not cards:
        raise HTTPException(404, "Nie znaleziono parku")
    p = cards[0]
    monuments = await db.trees.find({"park_id": pid, "is_monument": True, "condition": {"$ne": "removed"}},
                                    {"_id": 0, "public_token": 1, "tag_number": 1, "species": 1, "monument_name": 1, "photo_path": 1, "is_monument": 1}).to_list(200)
    places = await db.places.find({"park_id": pid}, {"_id": 0, "author_name": 0}).to_list(200)
    news = await db.news.find({"$or": [{"park_id": pid}, {"gmina_id": p["gmina_id"], "park_id": None}]}, {"_id": 0, "author_name": 0}).sort("created_at", -1).to_list(5)
    for x in places + news:
        x["park"] = p["name"] if x.get("park_id") == pid else ""
    return {"park": p, "monuments": monuments, "places": places, "news": news}


@router.get("/search")
async def search(q: str = Query(..., min_length=2, max_length=80)):
    if len(q.strip()) < 2:
        raise HTTPException(422, "Wpisz co najmniej 2 znaki")
    gminas = await _active_gminas()
    rx = {"$regex": re.escape(q.strip()), "$options": "i"}
    gids = list(gminas)
    g_hits = [{"id": g["id"], "name": g["name"]} for g in gminas.values() if re.search(re.escape(q.strip()), g["name"], re.I)][:8]
    parks = await db.parks.find({"gmina_id": {"$in": gids}, "name": rx}, {"_id": 0, "id": 1, "name": 1, "gmina_id": 1}).to_list(10)
    places = await db.places.find({"gmina_id": {"$in": gids}, "name": rx}, {"_id": 0, "id": 1, "name": 1, "gmina_id": 1, "category": 1}).to_list(10)
    trees = await db.trees.find({"gmina_id": {"$in": gids}, "is_monument": True, "$or": [{"monument_name": rx}, {"species": rx}]},
                                {"_id": 0, "public_token": 1, "monument_name": 1, "species": 1, "gmina_id": 1}).to_list(10)
    for x in parks + places + trees:
        x["gmina_name"] = gminas[x["gmina_id"]]["name"]
    return {"gminas": g_hits, "parks": parks, "places": places, "monuments": trees}
