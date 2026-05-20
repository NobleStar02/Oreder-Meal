"""
Doyuran Güveç — Dish Catalog routes.

Endpoints:
  GET    /api/admin/catalog
  POST   /api/admin/catalog
  PUT    /api/admin/catalog/{item_id}
  DELETE /api/admin/catalog/{item_id}
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import require_admin
from database import get_db
from models import DishCatalog
from schemas import DishCatalogIn, DishCatalogUpdate

router = APIRouter(prefix="/api")


@router.get("/admin/catalog")
async def admin_get_catalog(
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(DishCatalog).order_by(DishCatalog.name))
    items = res.scalars().all()
    return [
        {"id": i.id, "name": i.name, "description": i.description, "category": i.category}
        for i in items
    ]


@router.post("/admin/catalog")
async def admin_add_catalog(
    payload: DishCatalogIn,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    item = DishCatalog(
        id=uuid.uuid4().hex,
        name=payload.name,
        description=payload.description,
        category=payload.category,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(item)
    await db.commit()
    return {"id": item.id, "name": item.name, "description": item.description, "category": item.category}


@router.put("/admin/catalog/{item_id}")
async def admin_update_catalog(
    item_id: str,
    payload: DishCatalogUpdate,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(DishCatalog).where(DishCatalog.id == item_id))
    item = res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    for k, v in payload.model_dump().items():
        if v is not None:
            setattr(item, k, v)
    await db.commit()
    return {"id": item.id, "name": item.name, "description": item.description, "category": item.category}


@router.delete("/admin/catalog/{item_id}")
async def admin_delete_catalog(
    item_id: str,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(DishCatalog).where(DishCatalog.id == item_id))
    item = res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    await db.delete(item)
    await db.commit()
    return {"ok": True}
