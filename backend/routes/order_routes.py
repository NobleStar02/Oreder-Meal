"""
Doyuran Güveç — Order routes (company & admin).

Endpoints:
  POST /api/orders
  PUT  /api/orders/{order_id}
  GET  /api/orders/me
  GET  /api/orders/{order_id}
  GET  /api/admin/orders
  GET  /api/admin/orders/{order_id}
  PUT  /api/admin/orders/{order_id}/status
  GET  /api/admin/daily-summary
  POST /api/admin/daily-summary/print
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, require_admin
from config import category_rank, today_iso
from database import get_db
from models import MenuItem, Order, OrderItem, PrintJob
from schemas import OrderIn
from services.summary import compute_daily_summary, get_target_date

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


# ============================================================
# Helpers
# ============================================================

def _format_order(o: Order) -> dict:
    return {
        "id": o.id,
        "order_no": o.order_no,
        "user_id": o.user_id,
        "company_name": o.company_name,
        "contact_name": o.contact_name,
        "phone": o.phone,
        "address": o.address,
        "total": o.total or 0.0,
        "note": o.note,
        "status": o.status,
        "is_revised": o.is_revised,
        "revision_count": o.revision_count,
        "last_revised_at": o.last_revised_at,
        "order_date": o.order_date,
        "created_at": o.created_at,
        "meal_time": o.meal_time or "",
        "is_manual": getattr(o, "is_manual", False) or False,
        "items": sorted(
            [
                {
                    "menu_item_id": i.menu_item_id,
                    "name": i.name,
                    "category": i.category,
                    "quantity": i.quantity,
                }
                for i in o.items
            ],
            key=lambda x: category_rank(x["category"]),
        ),
    }


# ============================================================
# Company endpoints
# ============================================================

@router.post("/orders")
async def place_order(
    payload: OrderIn,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.get("role") != "company":
        raise HTTPException(status_code=403, detail="Sadece firmalar sipariş verebilir")
    if not payload.items:
        raise HTTPException(status_code=400, detail="Sipariş boş olamaz")

    item_ids = [it.menu_item_id for it in payload.items]
    res = await db.execute(select(MenuItem).where(MenuItem.id.in_(item_ids)))
    menu_items = res.scalars().all()
    menu_map = {m.id: m for m in menu_items}

    total = 0.0
    order_items = []

    for it in payload.items:
        m = menu_map.get(it.menu_item_id)
        if not m:
            raise HTTPException(status_code=400, detail=f"Yemek bulunamadı: {it.menu_item_id}")
        line_total = m.price * it.quantity
        total += line_total

        oi = OrderItem(
            id=str(uuid.uuid4()),
            menu_item_id=m.id,
            name=m.name,
            price=m.price,
            category=m.category or "Ana Yemek",
            quantity=it.quantity,
            line_total=line_total,
        )
        order_items.append(oi)

    order_items.sort(key=lambda x: category_rank(x.category))
    today = today_iso()

    # Generate sequential daily order number
    count_res = await db.execute(select(func.count(Order.id)).where(Order.order_date == today))
    order_no = count_res.scalar() + 1

    new_order = Order(
        id=str(uuid.uuid4()),
        order_no=order_no,
        user_id=user["id"],
        company_name=user.get("company_name", ""),
        contact_name=user.get("contact_name", ""),
        phone=user.get("phone", ""),
        address=user.get("address", ""),
        total=round(total, 2),
        note=payload.note or "",
        status="yeni",
        is_revised=False,
        revision_count=0,
        order_date=today,
        created_at=datetime.now(timezone.utc).isoformat(),
        meal_time=payload.meal_time or "",
        is_manual=False,
        is_printed=False,
        items=order_items,
    )

    db.add(new_order)
    await db.commit()
    await db.refresh(new_order)
    return _format_order(new_order)


@router.put("/orders/{order_id}")
async def update_own_order(
    order_id: str,
    payload: OrderIn,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Order).where(Order.id == order_id))
    order = res.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    if order.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Bu sipariş size ait değil")
    if order.status != "yeni":
        raise HTTPException(status_code=400, detail="Sipariş hazırlanmaya başlandığı için düzenlenemez")
    if not payload.items:
        raise HTTPException(status_code=400, detail="Sipariş boş olamaz")

    # Clear old items
    for item in order.items:
        await db.delete(item)

    item_ids = [it.menu_item_id for it in payload.items]
    m_res = await db.execute(select(MenuItem).where(MenuItem.id.in_(item_ids)))
    menu_items = m_res.scalars().all()
    menu_map = {m.id: m for m in menu_items}

    total = 0.0
    new_items = []
    for it in payload.items:
        m = menu_map.get(it.menu_item_id)
        if not m:
            raise HTTPException(status_code=400, detail=f"Yemek bulunamadı: {it.menu_item_id}")
        line_total = m.price * it.quantity
        total += line_total
        oi = OrderItem(
            id=str(uuid.uuid4()),
            order_id=order.id,
            menu_item_id=m.id,
            name=m.name,
            price=m.price,
            category=m.category or "Ana Yemek",
            quantity=it.quantity,
            line_total=line_total,
        )
        new_items.append(oi)
        db.add(oi)

    new_items.sort(key=lambda x: category_rank(x.category))

    order.total = round(total, 2)
    order.note = payload.note or ""
    order.meal_time = payload.meal_time or order.meal_time or ""
    order.is_revised = True
    order.revision_count = (order.revision_count or 0) + 1
    order.last_revised_at = datetime.now(timezone.utc).isoformat()
    order.is_printed = False  # Needs re-printing

    await db.commit()
    await db.refresh(order)
    return _format_order(order)


@router.get("/orders/me")
async def my_orders(
    page: Optional[int] = Query(None, ge=1),
    limit: Optional[int] = Query(None, ge=1, le=100),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Order).where(Order.user_id == user["id"]).order_by(desc(Order.created_at))
    if page and limit:
        query = query.offset((page - 1) * limit).limit(limit)
    res = await db.execute(query)
    return [_format_order(o) for o in res.scalars().unique().all()]


@router.get("/orders/{order_id}")
async def get_order(
    order_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Order).where(Order.id == order_id))
    order = res.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    if user.get("role") != "admin" and order.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Yetkisiz")
    return _format_order(order)


# ============================================================
# Admin endpoints
# ============================================================

@router.get("/admin/orders")
async def admin_orders(
    date: Optional[str] = None,
    status: Optional[str] = None,
    page: Optional[int] = Query(None, ge=1),
    limit: Optional[int] = Query(None, ge=1, le=100),
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Order)
    if date:
        query = query.where(Order.order_date == date)
    if status:
        query = query.where(Order.status == status)
    query = query.order_by(desc(Order.created_at))

    if page and limit:
        query = query.offset((page - 1) * limit).limit(limit)

    res = await db.execute(query)
    return [_format_order(o) for o in res.scalars().unique().all()]


@router.get("/admin/orders/{order_id}")
async def admin_order_detail(
    order_id: str,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Order).where(Order.id == order_id))
    order = res.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    return _format_order(order)


@router.put("/admin/orders/{order_id}/status")
async def admin_update_order_status(
    order_id: str,
    status: str = Query(...),
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if status not in ["yeni", "hazirlaniyor", "tamamlandi", "iptal"]:
        raise HTTPException(status_code=400, detail="Geçersiz durum")
    res = await db.execute(select(Order).where(Order.id == order_id))
    order = res.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    order.status = status
    await db.commit()
    return {"ok": True}


# ============================================================
# Daily summary (uses shared service)
# ============================================================

@router.get("/admin/daily-summary")
async def admin_daily_summary(
    date: Optional[str] = None,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Gün içinde firma bazlı kaç kişilik yemek (Ana Yemek sayısı)."""
    target_date = get_target_date(date)
    return await compute_daily_summary(db, target_date)


@router.post("/admin/daily-summary/print")
async def admin_print_daily_summary(
    date: Optional[str] = None,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Günlük özeti yazdırma kuyruğuna (PrintJob) ekler."""
    try:
        target_date = get_target_date(date)
        summary_data = await compute_daily_summary(db, target_date)

        job = PrintJob(
            id=str(uuid.uuid4()),
            job_type="daily_summary",
            payload=json.dumps(summary_data, ensure_ascii=False),
            is_printed=False,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        db.add(job)
        await db.commit()
        return {"status": "ok", "message": "Yazdırma kuyruğuna eklendi"}
    except Exception as e:
        logger.error(f"Günlük özet kuyruğa eklenirken hata: {e}")
        raise HTTPException(status_code=500, detail=f"Kuyruğa ekleme hatası: {str(e)}")
