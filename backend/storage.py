import os
import logging
import requests
from fastapi import HTTPException, UploadFile
from core import db, new_id, now, iso

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "arbotag"
ALLOWED = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif"}
MAX_SIZE = 10 * 1024 * 1024
_key = None


def init_storage(force=False):
    global _key
    if _key and not force:
        return _key
    r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ.get("EMERGENT_LLM_KEY")}, timeout=30)
    r.raise_for_status()
    _key = r.json()["storage_key"]
    return _key


def _put(path, data, ct):
    r = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage(), "Content-Type": ct}, data=data, timeout=120)
    if r.status_code == 404:
        r = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage(True), "Content-Type": ct}, data=data, timeout=120)
    r.raise_for_status()
    return r.json()


def get_object(path):
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage()}, timeout=60)
    if r.status_code == 404:
        r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage(True)}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


async def save_upload(f: UploadFile, gmina_id: str, kind: str, owner_id: str, public=False) -> str:
    ct = (f.content_type or "").lower()
    if ct not in ALLOWED:
        raise HTTPException(400, "Dozwolone są tylko zdjęcia (JPG, PNG, WEBP, HEIC)")
    data = await f.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(400, "Zdjęcie jest za duże (maks. 10 MB)")
    path = f"{APP_NAME}/{gmina_id}/{kind}/{new_id()}.{ALLOWED[ct]}"
    try:
        res = _put(path, data, ct)
    except Exception as e:
        logging.error(f"upload failed: {e}")
        raise HTTPException(502, "Nie udało się zapisać zdjęcia")
    await db.files.insert_one({
        "id": new_id(), "storage_path": res["path"], "gmina_id": gmina_id, "kind": kind,
        "owner_id": owner_id, "public": public, "content_type": ct, "size": res.get("size"),
        "is_deleted": False, "created_at": iso(now()),
    })
    return res["path"]
