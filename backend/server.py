import os
import logging
import secrets
from pathlib import Path
from datetime import timedelta
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from core import db, client, now, iso, new_id, hash_pw, check_pw, pesel_hash, token_urlsafe, TRIAL_DAYS
import routes_auth
import routes_owner
import routes_gmina
import routes_trees
import routes_billing
import routes_content
import routes_discover
import routes_osm
import routes_species
from storage import init_storage

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="ARBIX")
for r in (routes_osm, routes_species, routes_auth, routes_owner, routes_gmina, routes_trees, routes_billing, routes_discover, routes_content):
    app.include_router(r.router)


@app.get("/api/download/{token}")
async def download_code(token: str):
    path = Path(__file__).parent / "exports" / "arbix-kod.zip"
    if not secrets.compare_digest(token, os.environ.get("CODE_DOWNLOAD_TOKEN", "")) or not path.exists():
        raise HTTPException(404, "Nie znaleziono")
    return FileResponse(path, media_type="application/zip", filename="arbix-kod.zip")


@app.get("/api/")
async def root():
    return {"app": "ARBIX", "ok": True}


async def seed_owner():
    email = os.environ["OWNER_EMAIL"].strip().lower()
    pw = os.environ["OWNER_PASSWORD"]
    if not await db.users.find_one({"email": email}):
        await db.users.insert_one({"id": new_id(), "role": "owner", "gmina_id": None, "email": email,
                                   "first_name": "Właściciel", "last_name": "Platformy", "status": "active",
                                   "password_hash": hash_pw(pw), "created_at": iso(now())})


DEMO_PW = os.environ["DEMO_PASSWORD"]
DEMO = {"admin_email": "admin@demo.arbotag.pl", "admin_pw": DEMO_PW,
        "worker_pesel": "85010112345", "worker_pw": DEMO_PW,
        "resident_pesel": "90021512347", "resident_pw": DEMO_PW,
        "listed_pesel": "92030312349"}


async def sync_demo_users():
    for role, q in (("gmina_admin", {"email": DEMO["admin_email"]}), ("worker", {"pesel_hash": pesel_hash(DEMO["worker_pesel"])}),
                    ("resident", {"pesel_hash": pesel_hash(DEMO["resident_pesel"])})):
        u = await db.users.find_one(q, {"_id": 0, "password_hash": 1, "demo_role": 1})
        if not u:
            continue
        upd = {"demo_role": role}
        if not u.get("password_hash") or not check_pw(DEMO_PW, u["password_hash"]):
            upd["password_hash"] = hash_pw(DEMO_PW)
        await db.users.update_one(q, {"$set": upd})


DEMO_MONUMENT = {
    "is_monument": True, "monument_name": "Dąb Tadeusz", "monument_decision": "Uchwała Rady Gminy nr XII/85/2004",
    "monument_date": "2004-05-12",
    "history": "Dąb posadzono około 1890 roku, gdy dawny ogród dworski zamieniano w park miejski. Według miejscowej tradycji "
               "pod jego koroną w 1918 roku mieszkańcy świętowali odzyskanie niepodległości. W 2004 roku Rada Gminy ustanowiła go "
               "pomnikiem przyrody i nadała imię „Dąb Tadeusz” na cześć patrona parku.",
}
DEMO_LIPA_HISTORY = "Lipa jest częścią alei lipowej posadzonej w 1952 roku przez uczniów miejscowej szkoły w czynie społecznym."


async def seed_demo():
    if await db.gminas.find_one({"demo": True}):
        return
    gid = new_id()
    await db.gminas.insert_one({"id": gid, "name": "Gmina Zielone Pole (demo)", "plan": "mala", "billing_cycle": None,
                                "manual": None, "manual_until": None, "paid_until": None, "demo": True,
                                "trial_until": iso(now() + timedelta(days=TRIAL_DAYS)), "created_at": iso(now())})
    base = {"gmina_id": gid, "status": "active", "created_at": iso(now())}
    await db.users.insert_many([
        {**base, "id": new_id(), "role": "gmina_admin", "email": DEMO["admin_email"], "first_name": "Anna", "last_name": "Kowalska", "password_hash": hash_pw(DEMO["admin_pw"])},
        {**base, "id": new_id(), "role": "worker", "pesel_hash": pesel_hash(DEMO["worker_pesel"]), "first_name": "Piotr", "last_name": "Nowak", "password_hash": hash_pw(DEMO["worker_pw"])},
        {**base, "id": new_id(), "role": "resident", "pesel_hash": pesel_hash(DEMO["resident_pesel"]), "first_name": "Maria", "last_name": "Wiśniewska", "address": "ul. Lipowa 5, Zielone Pole", "password_hash": hash_pw(DEMO["resident_pw"])},
    ])
    await db.pesel_list.insert_many([{"gmina_id": gid, "pesel_hash": pesel_hash(p)} for p in (DEMO["resident_pesel"], DEMO["listed_pesel"])])
    p1, p2 = new_id(), new_id()
    await db.parks.insert_many([
        {"id": p1, "gmina_id": gid, "name": "Park Miejski im. Kościuszki", "description": "Główny park gminy", "created_at": iso(now())},
        {"id": p2, "gmina_id": gid, "name": "Skwer przy Ratuszu", "description": "", "created_at": iso(now())},
    ])
    trees = [
        ("ZP-0001", "Dąb szypułkowy", "Quercus robur", p1, "Przy głównej alei, obok fontanny", 52.2297, 21.0122, 1890, 410, 24, "good"),
        ("ZP-0002", "Lipa drobnolistna", "Tilia cordata", p1, "Aleja lipowa, 3. drzewo od wejścia", 52.2301, 21.0130, 1952, 220, 18, "attention"),
        ("ZP-0003", "Klon zwyczajny", "Acer platanoides", p1, "Przy placu zabaw", 52.2305, 21.0119, 1975, 160, 15, "good"),
        ("ZP-0004", "Kasztanowiec biały", "Aesculus hippocastanum", p2, "Narożnik skweru od ul. Ratuszowej", 52.2290, 21.0141, 1938, 290, 20, "danger"),
        ("ZP-0005", "Brzoza brodawkowata", "Betula pendula", p2, "Przy ławkach", 52.2292, 21.0138, 1995, 120, 16, "good"),
    ]
    docs = []
    for tag, sp, lat_name, park, loc, la, ln, yr, circ, h, cond in trees:
        docs.append({"id": new_id(), "gmina_id": gid, "tag_number": tag, "species": sp, "species_latin": lat_name, "park_id": park,
                     "location_desc": loc, "lat": la, "lng": ln, "planted_year": yr, "circumference_cm": circ, "height_m": h,
                     "condition": cond, "description": "", "photo_path": None, "public_token": token_urlsafe(),
                     "worker_token": token_urlsafe(12), "created_at": iso(now()), "updated_at": iso(now())})
    await db.trees.insert_many(docs)
    await db.trees.update_one({"id": docs[0]["id"]}, {"$set": DEMO_MONUMENT})
    await db.trees.update_one({"id": docs[1]["id"]}, {"$set": {"history": DEMO_LIPA_HISTORY}})
    await db.work_logs.insert_one({"id": new_id(), "tree_id": docs[0]["id"], "gmina_id": gid, "date": now().date().isoformat(),
                                   "type": "inspection", "description": "Coroczny przegląd dendrologiczny. Drzewo w dobrej kondycji.",
                                   "performer_id": None, "performer_name": "Piotr Nowak", "photos_before": [], "photos_after": [],
                                   "condition_after": "good", "report_id": None, "created_at": iso(now())})


U = "https://images.unsplash.com/photo-{}?crop=entropy&cs=srgb&fm=jpg&q=80&w=1200"
DEMO_PLACES = [
    ("Fontanna „Globus”", "fountain", "Brązowa fontanna z 1928 roku, ulubione miejsce spotkań mieszkańców. Latem działa codziennie od 10:00 do 20:00.", 52.2299, 21.0126, "1778271279377-0738e017deb9"),
    ("Altana na wyspie", "heritage", "Klasycystyczna altana z XIX wieku na wyspie parkowego stawu. Najpiękniej wygląda jesienią o zachodzie słońca.", 52.2307, 21.0111, "1791657925772-75f46d03becb"),
    ("Aleja spacerowa", "viewpoint", "Kamienna aleja prowadząca od ratusza do serca parku, z ławkami i widokiem na fontannę.", 52.2289, 21.0146, "1675781179542-aa025fb45ba2"),
]
DEMO_NEWS = [
    ("Wspólne sadzenie drzew w sobotę", "Zapraszamy mieszkańców i gości na wspólne sadzenie 40 młodych lip w Parku Miejskim. Start o 10:00 przy fontannie, sadzonki i rękawice zapewnia gmina.", "1598335624134-5bceb5de202d"),
    ("Koncert w altanie", "W niedzielę o 17:00 w altanie na wyspie zagra orkiestra dęta. Wstęp wolny — weź koc i przyjdź z rodziną.", "1763390525067-ecb3c15b858f"),
    ("Jesienny przegląd drzew", "W tym tygodniu pracownicy gminy prowadzą coroczny przegląd drzew w parku. Prosimy o ostrożność w pobliżu oznakowanych miejsc prac.", "1760289029369-cc48275b8d80"),
]


async def seed_demo_content():
    g = await db.gminas.find_one({"demo": True}, {"_id": 0, "id": 1})
    if not g:
        return
    gid = g["id"]
    park = await db.parks.find_one({"gmina_id": gid, "name": {"$regex": "^Park"}}, {"_id": 0, "id": 1})
    pid = park["id"] if park else None
    if not await db.places.count_documents({"gmina_id": gid}):
        await db.places.insert_many([{"id": new_id(), "gmina_id": gid, "name": n, "category": c, "description": d, "park_id": pid,
                                      "lat": la, "lng": ln, "photo_path": None, "image_url": U.format(img), "author_name": "Gmina",
                                      "created_at": iso(now() - timedelta(minutes=i))} for i, (n, c, d, la, ln, img) in enumerate(DEMO_PLACES)])
    if not await db.news.count_documents({"gmina_id": gid}):
        await db.news.insert_many([{"id": new_id(), "gmina_id": gid, "title": t, "body": b, "park_id": pid, "photo_path": None,
                                    "image_url": U.format(img), "author_name": "Gmina", "created_at": iso(now() - timedelta(days=i * 2))}
                                   for i, (t, b, img) in enumerate(DEMO_NEWS)])


@app.on_event("startup")
async def startup():
    await db.users.create_index("id", unique=True)
    await db.users.create_index("email", unique=True, partialFilterExpression={"email": {"$type": "string"}})
    await db.users.create_index("pesel_hash", unique=True, partialFilterExpression={"pesel_hash": {"$type": "string"}})
    await db.pesel_list.create_index([("gmina_id", 1), ("pesel_hash", 1)], unique=True)
    await db.trees.create_index("public_token", unique=True)
    await db.trees.create_index("worker_token", unique=True)
    await db.trees.create_index([("gmina_id", 1), ("tag_number", 1)], unique=True)
    await db.files.create_index("storage_path")
    await db.osm_trees.create_index("osm_id", unique=True)
    await db.osm_trees.create_index([("lat", 1), ("lng", 1)])
    await db.osm_cells.create_index("key", unique=True)
    await db.species_info.create_index([("key", 1), ("gmina_id", 1)], unique=True)
    await db.payment_transactions.create_index("session_id", unique=True)
    await seed_owner()
    await seed_demo()
    await sync_demo_users()
    await seed_demo_content()
    try:
        init_storage()
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    try:
        await run_in_threadpool(routes_billing.setup_catalog)
    except Exception as e:
        logger.error(f"Stripe catalog setup failed: {e}")


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
