from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from pydantic import BaseModel, Field
from core import db, now, iso, new_id, require_roles, get_gmina, subscription_state
from storage import save_upload

router = APIRouter(prefix="/api")
admin = require_roles("gmina_admin")
PlaceCat = Literal["fountain", "viewpoint", "heritage", "playground", "nature", "other"]


class PlaceIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    category: PlaceCat = "other"
    description: str = Field("", max_length=4000)
    park_id: Optional[str] = None
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)


class NewsIn(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    body: str = Field(min_length=3, max_length=8000)
    park_id: Optional[str] = None


async def _check_park(pid, gid):
    if pid and not await db.parks.find_one({"id": pid, "gmina_id": gid}):
        raise HTTPException(400, "Nieprawidłowy park")


async def _parks(gid):
    return {p["id"]: p["name"] for p in await db.parks.find({"gmina_id": gid}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)}


async def _with_park(items, gid):
    parks = await _parks(gid)
    for i in items:
        i["park"] = parks.get(i.get("park_id"), "")
    return items


def register_crud(name: str, model):
    coll = db[name]

    @router.get(f"/gmina/{name}", name=f"list_{name}")
    async def list_items(u: dict = Depends(admin)):
        items = await coll.find({"gmina_id": u["gmina_id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
        return await _with_park(items, u["gmina_id"])

    @router.post(f"/gmina/{name}", name=f"add_{name}")
    async def add_item(body: model, u: dict = Depends(admin)):
        await _check_park(body.park_id, u["gmina_id"])
        doc = {**body.model_dump(), "id": new_id(), "gmina_id": u["gmina_id"], "photo_path": None, "image_url": None,
               "author_name": f"{u.get('first_name', '')} {u.get('last_name', '')}".strip(), "created_at": iso(now())}
        await coll.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.put(f"/gmina/{name}/{{iid}}", name=f"edit_{name}")
    async def edit_item(iid: str, body: model, u: dict = Depends(admin)):
        await _check_park(body.park_id, u["gmina_id"])
        r = await coll.update_one({"id": iid, "gmina_id": u["gmina_id"]}, {"$set": {**body.model_dump(), "updated_at": iso(now())}})
        if not r.matched_count:
            raise HTTPException(404, "Nie znaleziono")
        return await coll.find_one({"id": iid}, {"_id": 0})

    @router.delete(f"/gmina/{name}/{{iid}}", name=f"del_{name}")
    async def del_item(iid: str, u: dict = Depends(admin)):
        doc = await coll.find_one_and_delete({"id": iid, "gmina_id": u["gmina_id"]})
        if not doc:
            raise HTTPException(404, "Nie znaleziono")
        if doc.get("photo_path"):
            await db.files.update_one({"storage_path": doc["photo_path"]}, {"$set": {"is_deleted": True}})
        return {"ok": True}

    @router.post(f"/gmina/{name}/{{iid}}/photo", name=f"photo_{name}")
    async def photo(iid: str, file: UploadFile = File(...), u: dict = Depends(admin)):
        doc = await coll.find_one({"id": iid, "gmina_id": u["gmina_id"]}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Nie znaleziono")
        path = await save_upload(file, u["gmina_id"], name, u["id"], public=True)
        if doc.get("photo_path"):
            await db.files.update_one({"storage_path": doc["photo_path"]}, {"$set": {"is_deleted": True}})
        await coll.update_one({"id": iid}, {"$set": {"photo_path": path}})
        return {"photo_path": path}

    @router.get(f"/public/gminas/{{gid}}/{name}", name=f"public_list_{name}")
    async def public_list(gid: str, limit: int = Query(100, ge=1, le=500)):
        g = await get_gmina(gid)
        if not subscription_state(g)["active"]:
            return []
        items = await coll.find({"gmina_id": gid}, {"_id": 0, "author_name": 0}).sort("created_at", -1).to_list(limit)
        return await _with_park(items, gid)

    @router.get(f"/public/{name}/{{iid}}", name=f"public_get_{name}")
    async def public_get(iid: str):
        doc = await coll.find_one({"id": iid}, {"_id": 0, "author_name": 0})
        if not doc or not subscription_state(await get_gmina(doc["gmina_id"]))["active"]:
            raise HTTPException(404, "Nie znaleziono")
        doc["park"] = (await _parks(doc["gmina_id"])).get(doc.get("park_id"), "")
        return doc


register_crud("places", PlaceIn)
register_crud("news", NewsIn)
