"""
Doyuran Güveç — Printer API routes.

Provides secure HTTP polling endpoints for the Windows PC printer service.
"""

import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import require_admin
from database import get_db
from models import Order, PrintJob

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/printer")


@router.get("/pending")
async def get_pending_print_jobs(
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Bekleyen tüm sipariş fişlerini ve gün sonu özetlerini kuyruk sırasıyla listeler."""
    try:
        # 1. Bekleyen siparişleri çek (is_printed = False)
        orders_res = await db.execute(
            select(Order)
            .where(Order.is_printed == False)
            .order_by(Order.order_no)
        )
        orders = orders_res.scalars().unique().all()

        # 2. Bekleyen özet işlerini çek (is_printed = False)
        jobs_res = await db.execute(
            select(PrintJob)
            .where(PrintJob.is_printed == False)
            .order_by(PrintJob.created_at)
        )
        jobs = jobs_res.scalars().all()

        pending_list = []

        # Siparişleri ortak şablona dönüştür
        for o in orders:
            order_payload = {
                "id": o.id,
                "order_no": o.order_no,
                "company_name": o.company_name or "",
                "contact_name": o.contact_name or "",
                "phone": o.phone or "",
                "address": o.address or "",
                "note": o.note or "",
                "status": o.status or "",
                "is_revised": o.is_revised or False,
                "revision_count": o.revision_count or 0,
                "last_revised_at": o.last_revised_at,
                "order_date": o.order_date or "",
                "created_at": o.created_at or "",
                "meal_time": o.meal_time or "",
                "is_manual": getattr(o, "is_manual", False) or False,
                "items": [
                    {"name": i.name, "category": i.category, "quantity": i.quantity}
                    for i in o.items
                ],
            }
            pending_list.append({
                "id": o.id,
                "job_type": "order",
                "payload": order_payload,
            })

        # Özet işlerini ortak şablona dönüştür
        for j in jobs:
            try:
                payload_dict = json.loads(j.payload)
            except Exception:
                payload_dict = j.payload

            pending_list.append({
                "id": j.id,
                "job_type": j.job_type,
                "payload": payload_dict,
            })

        return pending_list
    except Exception as e:
        logger.error(f"Bekleyen yazıcı işleri çekilirken hata: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/completed/{job_type}/{job_id}")
async def mark_job_completed(
    job_type: str,
    job_id: str,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Başarıyla yazdırılan bir işi onaylar ve 'is_printed = True' yapar."""
    try:
        if job_type == "order":
            res = await db.execute(select(Order).where(Order.id == job_id))
            o = res.scalars().first()
            if not o:
                raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
            o.is_printed = True
            await db.commit()
            logger.info(f"Sipariş #{o.order_no} basıldı olarak işaretlendi.")
            return {"status": "ok", "message": f"Sipariş #{o.order_no} basıldı."}
        elif job_type in ("daily_summary", "manual_summary"):
            res = await db.execute(select(PrintJob).where(PrintJob.id == job_id))
            j = res.scalars().first()
            if not j:
                raise HTTPException(status_code=404, detail="Yazdırma işi bulunamadı")
            j.is_printed = True
            await db.commit()
            logger.info(f"Özet işi ({j.job_type}) basıldı olarak işaretlendi.")
            return {"status": "ok", "message": "Özet işi basıldı."}
        else:
            raise HTTPException(status_code=400, detail="Geçersiz iş tipi")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Yazıcı işi onaylanırken hata: {e}")
        raise HTTPException(status_code=500, detail=str(e))
