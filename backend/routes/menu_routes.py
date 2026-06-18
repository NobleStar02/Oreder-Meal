"""
Doyuran Güveç — Menu routes.

Endpoints:
  GET    /api/menu/today
  GET    /api/admin/menu
  POST   /api/admin/menu
  POST   /api/admin/menu/batch   (new — batch create)
  PUT    /api/admin/menu/{item_id}
  DELETE /api/admin/menu/{item_id}
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import require_admin
from config import category_rank, today_iso
from database import get_db
from models import MenuItem, Order
from schemas import MenuItemIn, MenuItemUpdate

router = APIRouter(prefix="/api")


# ---------- Public ----------
@router.get("/menu/today")
async def menu_today(db: AsyncSession = Depends(get_db)):
    today = today_iso()
    res = await db.execute(
        select(MenuItem).where(MenuItem.available == True, MenuItem.available_date == today)
    )
    items = res.scalars().all()
    out = [
        {
            "id": i.id,
            "name": i.name,
            "description": i.description,
            "price": i.price,
            "category": i.category,
            "available": i.available,
            "available_date": i.available_date,
        }
        for i in items
    ]
    out.sort(key=lambda x: category_rank(x.get("category", "")))
    return out


# ---------- Admin: list ----------
@router.get("/admin/menu")
async def admin_list_menu(
    date: Optional[str] = None,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(MenuItem)
    if date:
        query = query.where(MenuItem.available_date == date)
    res = await db.execute(query)
    items = res.scalars().all()
    out = [
        {
            "id": i.id,
            "name": i.name,
            "description": i.description,
            "price": i.price,
            "category": i.category,
            "available": i.available,
            "available_date": i.available_date,
        }
        for i in items
    ]
    out.sort(key=lambda x: category_rank(x.get("category", "")))
    return out


# ---------- Admin: create single ----------
@router.post("/admin/menu")
async def admin_create_menu(
    payload: MenuItemIn,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    new_date = payload.available_date or today_iso()

    item = MenuItem(
        id=str(uuid.uuid4()),
        name=payload.name,
        description=payload.description or "",
        price=payload.price or 0.0,
        category=payload.category or "Ana Yemek",
        available=payload.available,
        available_date=new_date,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(item)

    # Auto-deactivate previous dates
    old = await db.execute(
        select(MenuItem).where(MenuItem.available_date < new_date, MenuItem.available == True)
    )
    for o in old.scalars().all():
        o.available = False

    await db.commit()
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description,
        "price": item.price,
        "category": item.category,
        "available": item.available,
        "available_date": item.available_date,
    }


# ---------- Admin: batch create (new) ----------
@router.post("/admin/menu/batch")
async def admin_batch_create_menu(
    payload: List[MenuItemIn],
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Accept a list of MenuItemIn and create them all at once."""
    created = []
    for p in payload:
        new_date = p.available_date or today_iso()
        item = MenuItem(
            id=str(uuid.uuid4()),
            name=p.name,
            description=p.description or "",
            price=p.price or 0.0,
            category=p.category or "Ana Yemek",
            available=p.available,
            available_date=new_date,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        db.add(item)
        created.append(item)

    # Auto-deactivate items from older dates
    if created:
        latest_date = max(i.available_date for i in created)
        old = await db.execute(
            select(MenuItem).where(
                MenuItem.available_date < latest_date, MenuItem.available == True
            )
        )
        for o in old.scalars().all():
            o.available = False

    await db.commit()

    return [
        {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "price": item.price,
            "category": item.category,
            "available": item.available,
            "available_date": item.available_date,
        }
        for item in created
    ]


# ---------- Admin: update ----------
@router.put("/admin/menu/{item_id}")
async def admin_update_menu(
    item_id: str,
    payload: MenuItemUpdate,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Yemek bulunamadı")

    for k, v in payload.model_dump().items():
        if v is not None:
            setattr(item, k, v)

    await db.commit()
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description,
        "price": item.price,
        "category": item.category,
        "available": item.available,
        "available_date": item.available_date,
    }


# ---------- Admin: delete ----------
@router.delete("/admin/menu/{item_id}")
async def admin_delete_menu(
    item_id: str,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Yemek bulunamadı")
    await db.delete(item)
    await db.commit()
    return {"ok": True}


# ---------- Admin: system reset ----------
@router.post("/admin/system/reset")
async def admin_system_reset(
    mode: str = Query(..., description="'today' veya 'all'"),
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if mode not in ["today", "all"]:
        raise HTTPException(status_code=400, detail="Geçersiz mod. 'today' veya 'all' olmalı.")
    
    try:
        if mode == "today":
            today = today_iso()
            
            # 1. Bugünün siparişlerini sil (cascade delete order items otomatik silinecektir)
            orders_res = await db.execute(
                select(Order).where(Order.order_date == today)
            )
            orders = orders_res.scalars().unique().all()
            for o in orders:
                await db.delete(o)
                
            # 2. Bugünün menü öğelerini sil
            menu_res = await db.execute(
                select(MenuItem).where(MenuItem.available_date == today)
            )
            menu_items = menu_res.scalars().all()
            for m in menu_items:
                await db.delete(m)
                
            await db.commit()
            return {
                "ok": True,
                "message": f"Bugünkü menü ve siparişler sıfırlandı. Silinen sipariş: {len(orders)}, Silinen yemek: {len(menu_items)}"
            }
            
        elif mode == "all":
            # 1. Tüm siparişleri sil
            orders_res = await db.execute(select(Order))
            orders = orders_res.scalars().unique().all()
            for o in orders:
                await db.delete(o)
                
            # 2. Tüm menü öğelerini sil
            menu_res = await db.execute(select(MenuItem))
            menu_items = menu_res.scalars().all()
            for m in menu_items:
                await db.delete(m)
                
            await db.commit()
            return {
                "ok": True,
                "message": f"Tüm menü ve sipariş geçmişi sıfırlandı. Silinen sipariş: {len(orders)}, Silinen yemek: {len(menu_items)}"
            }
            
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Sıfırlama işlemi başarısız oldu: {str(e)}"
        )

