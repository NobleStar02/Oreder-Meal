"""
Doyuran Güveç — Manual order routes (admin).

Endpoints:
  POST /api/admin/manual-order
  GET  /api/admin/manual-orders
  GET  /api/admin/manual-orders/summary
  POST /api/admin/manual-orders/summary/print
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import require_admin
from config import category_rank, today_iso
from database import get_db
from models import MenuItem, Order, OrderItem, PrintJob
from schemas import ManualOrderIn
from services.summary import compute_daily_summary, get_target_date

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


def _format_order(o: Order) -> dict:
    return {
        "id": o.id,
        "order_no": o.order_no,
        "user_id": o.user_id,
        "company_name": o.company_name,
        "contact_name": o.contact_name,
        "phone": o.phone,
        "address": o.address,
        "note": o.note,
        "status": o.status,
        "is_revised": o.is_revised,
        "revision_count": o.revision_count,
        "last_revised_at": o.last_revised_at,
        "order_date": o.order_date,
        "created_at": o.created_at,
        "meal_time": o.meal_time or "",
        "is_manual": getattr(o, "is_manual", False) or False,
        "items": [
            {
                "menu_item_id": i.menu_item_id,
                "name": i.name,
                "category": i.category,
                "quantity": i.quantity,
            }
            for i in o.items
        ],
    }


# ---------- Create manual order ----------
@router.post("/admin/manual-order")
async def admin_manual_order(
    payload: ManualOrderIn,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin panelinden manuel sipariş girişi. Kayıtlı firma hesabı gerekmez."""
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

    count_res = await db.execute(select(func.count(Order.id)).where(Order.order_date == today))
    order_no = count_res.scalar() + 1

    new_order = Order(
        id=str(uuid.uuid4()),
        order_no=order_no,
        user_id=user["id"],
        company_name=payload.company_name,
        contact_name="",
        phone="",
        address="",
        total=round(total, 2),
        note=payload.note or "",
        status="yeni",
        is_revised=False,
        revision_count=0,
        order_date=today,
        created_at=datetime.now(timezone.utc).isoformat(),
        meal_time=payload.meal_time or "",
        is_manual=True,
        items=order_items,
    )

    db.add(new_order)
    await db.commit()
    await db.refresh(new_order)
    logger.info(f"Manuel sipariş #{order_no} oluşturuldu: {payload.company_name}")
    return _format_order(new_order)


# ---------- List manual orders ----------
@router.get("/admin/manual-orders")
async def admin_manual_orders(
    date: Optional[str] = None,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Manuel siparişlerin geçmişi (tarihe göre filtrelenebilir)."""
    query = select(Order).where(Order.is_manual == True)
    if date:
        query = query.where(Order.order_date == date)
    query = query.order_by(desc(Order.created_at))
    res = await db.execute(query)
    return [_format_order(o) for o in res.scalars().unique().all()]


# ---------- Manual orders summary ----------
@router.get("/admin/manual-orders/summary")
async def admin_manual_orders_summary(
    date: Optional[str] = None,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Manuel siparişlerin gün sonu özeti — Ana Yemek adedine göre kişi sayısı."""
    target_date = get_target_date(date)
    return await compute_daily_summary(db, target_date, manual_only=True, include_items=True)


# ---------- Print manual orders summary ----------
@router.post("/admin/manual-orders/summary/print")
async def admin_print_manual_orders_summary(
    date: Optional[str] = None,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Manuel siparişlerin gün sonu özetini yazdırma kuyruğuna (PrintJob) ekler."""
    try:
        target_date = get_target_date(date)
        summary_data = await compute_daily_summary(db, target_date, manual_only=True)
        summary_data["is_manual_summary"] = True

        job = PrintJob(
            id=str(uuid.uuid4()),
            job_type="manual_summary",
            payload=json.dumps(summary_data, ensure_ascii=False),
            is_printed=False,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        db.add(job)
        await db.commit()
        return {"status": "ok", "message": "Yazdırma kuyruğuna eklendi"}
    except Exception as e:
        logger.error(f"Manuel özet kuyruğa eklenirken hata: {e}")
        raise HTTPException(status_code=500, detail=f"Kuyruğa ekleme hatası: {str(e)}")
