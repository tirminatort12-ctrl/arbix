import asyncio
import json
import os
import re
import logging
from datetime import timedelta
from typing import List, Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from emergentintegrations.llm.chat import LlmChat, UserMessage
from core import db, now, iso, new_id, require_roles

router = APIRouter(prefix="/api")
admin = require_roles("gmina_admin")
log = logging.getLogger("species")
INFLIGHT = set()
LANG_NAMES = {"pl": "polskim", "en": "angielskim", "uk": "ukraińskim", "ru": "rosyjskim"}
SYSTEM = ("Jesteś przyrodnikiem i edukatorem w polskim parku. Piszesz po polsku, prosto i ciekawie, dla turystów i dzieci. "
          "Podajesz tylko sprawdzone, ogólnie znane fakty o gatunku w warunkach Polski. Odpowiadasz wyłącznie poprawnym JSON.")
PROMPT = """Gatunek drzewa: "{name}"{latin}.
Zwróć JSON o kluczach:
"title": polska nazwa gatunku,
"summary": 2-3 zdania: co to za drzewo, jak je rozpoznać,
"birds": lista 3-6 ptaków, które w Polsce często żerują lub gniazdują na tym drzewie (polskie nazwy),
"insects": lista 3-6 owadów lub innych zwierząt związanych z tym drzewem (polskie nazwy),
"facts": lista 3-4 krótkich ciekawostek (po 1 zdaniu),
"season": 1 zdanie: kiedy kwitnie / owocuje / na co zwrócić uwagę w ciągu roku.
Wszystkie wartości napisz w języku {lang}.
Jeśli nazwa nie jest gatunkiem drzewa, zwróć {{"error": "unknown"}}."""


class SpeciesContent(BaseModel):
    title: str = Field("", max_length=120)
    summary: str = Field("", max_length=1500)
    birds: List[str] = Field(default_factory=list, max_length=12)
    insects: List[str] = Field(default_factory=list, max_length=12)
    facts: List[str] = Field(default_factory=list, max_length=8)
    season: str = Field("", max_length=500)


class SpeciesIn(BaseModel):
    species: str = Field(..., min_length=2, max_length=100)
    content: SpeciesContent


def skey(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip().lower())


async def _known(name: str) -> bool:
    rx = {"$regex": f"^{re.escape(name.strip())}$", "$options": "i"}
    return bool(await db.trees.find_one({"$or": [{"species": rx}, {"species_latin": rx}]}, {"_id": 1})
                or await db.osm_trees.find_one({"species": rx}, {"_id": 1}))


def _clean(c: dict) -> dict:
    lst = lambda v, n=80: [str(x).strip()[:n] for x in (v or []) if str(x).strip()][:8]
    return SpeciesContent(title=str(c.get("title", ""))[:120], summary=str(c.get("summary", ""))[:1500], birds=lst(c.get("birds")),
                          insects=lst(c.get("insects")), facts=lst(c.get("facts"), 300), season=str(c.get("season", ""))[:500]).model_dump()


async def _generate(key: str, name: str, latin: str, lang: str = "pl"):
    try:
        chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=f"species-{new_id()}", system_message=SYSTEM).with_model("openai", "gpt-5.4")
        text = await chat.send_message(UserMessage(text=PROMPT.format(name=name, lang=LANG_NAMES[lang], latin=f" ({latin})" if latin and skey(latin) != skey(name) else "")))
        m = re.search(r"\{.*\}", text, re.S)
        data = json.loads(m.group(0)) if m else {}
        doc = {"status": "none"} if data.get("error") or not data.get("summary") else {"status": "ready", "content": _clean(data)}
        await db.species_info.update_one({"key": key, "gmina_id": None}, {"$set": {**doc, "source": "ai", "updated_at": iso(now())}}, upsert=True)
    except Exception as e:  # noqa: BLE001
        log.warning("species generation failed for %s: %s", key, e)
        await db.species_info.update_one({"key": key, "gmina_id": None}, {"$set": {"status": "failed", "source": "ai", "updated_at": iso(now())}}, upsert=True)
    finally:
        INFLIGHT.discard(key)


def _out(d):
    return {"status": d.get("status", "ready"), "content": d.get("content"), "source": d.get("source", "ai")}


@router.get("/public/species-info")
async def species_info(name: str = Query(..., min_length=2, max_length=100), latin: str = Query("", max_length=100), gid: str = Query("", max_length=60),
                       lang: Literal["pl", "en", "uk", "ru"] = "pl"):
    base = [k for k in (skey(latin), skey(name)) if k]
    keys = base if lang == "pl" else [f"{k}|{lang}" for k in base]
    doc = await _cached(keys, gid if lang == "pl" else "")
    if doc == "cooldown":
        return NONE
    if doc:
        return _out(doc)
    if not (await _known(name) or (latin and await _known(latin))):
        return NONE
    _start(keys[0], name, latin, lang)
    return {"status": "pending", "content": None}


NONE = {"status": "none", "content": None}


async def _cached(keys, gid):
    if gid:
        own = await db.species_info.find_one({"key": {"$in": keys}, "gmina_id": gid}, {"_id": 0})
        if own:
            return own
    doc = await db.species_info.find_one({"key": {"$in": keys}, "gmina_id": None}, {"_id": 0})
    if doc and doc.get("status") == "failed":
        return "cooldown" if doc["updated_at"] > iso(now() - timedelta(minutes=30)) else None
    return doc


def _start(key, name, latin, lang):
    if key not in INFLIGHT:
        INFLIGHT.add(key)
        asyncio.create_task(_generate(key, name, latin, lang))


@router.get("/gmina/species")
async def gmina_species(u: dict = Depends(admin)):
    trees = await db.trees.find({"gmina_id": u["gmina_id"]}, {"_id": 0, "species": 1, "species_latin": 1}).to_list(50000)
    seen = {}
    for t in trees:
        k = skey(t.get("species_latin") or t.get("species"))
        if k and k not in seen:
            seen[k] = {"key": k, "species": t.get("species", ""), "latin": t.get("species_latin", ""), "count": 0}
        if k:
            seen[k]["count"] += 1
    infos = {(d["key"], d.get("gmina_id")): d async for d in db.species_info.find({"key": {"$in": list(seen)}, "gmina_id": {"$in": [None, u["gmina_id"]]}}, {"_id": 0})}
    for k, s in seen.items():
        d = infos.get((k, u["gmina_id"])) or infos.get((k, None))
        s.update(status=d.get("status") if d else "missing", source=d.get("source") if d else None, content=d.get("content") if d else None)
    return sorted(seen.values(), key=lambda x: -x["count"])


@router.put("/gmina/species/{key}")
async def save_species(key: str, body: SpeciesIn, u: dict = Depends(admin)):
    if skey(key) not in {s["key"] for s in await gmina_species(u)}:
        raise HTTPException(404, "Nie ma takiego gatunku w Twojej gminie")
    await db.species_info.update_one({"key": skey(key), "gmina_id": u["gmina_id"]},
                                     {"$set": {"status": "ready", "content": _clean(body.content.model_dump()), "source": "gmina", "species": body.species, "updated_at": iso(now())}}, upsert=True)
    return {"ok": True}


@router.delete("/gmina/species/{key}")
async def reset_species(key: str, u: dict = Depends(admin)):
    await db.species_info.delete_one({"key": skey(key), "gmina_id": u["gmina_id"]})
    return {"ok": True}


@router.post("/gmina/species/{key}/regenerate")
async def regenerate(key: str, u: dict = Depends(admin)):
    k = skey(key)
    t = await db.trees.find_one({"gmina_id": u["gmina_id"], "$or": [{"species_latin": {"$regex": f"^{re.escape(key)}$", "$options": "i"}}, {"species": {"$regex": f"^{re.escape(key)}$", "$options": "i"}}]}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Nie ma takiego gatunku w Twojej gminie")
    if k not in INFLIGHT:
        await db.species_info.delete_one({"key": k, "gmina_id": None})
        INFLIGHT.add(k)
        asyncio.create_task(_generate(k, t.get("species") or key, t.get("species_latin", "")))
    return {"status": "pending"}
