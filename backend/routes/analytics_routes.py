"""
Doyuran Güveç — Analytics routes.

Endpoints:
  GET /api/admin/analytics/summary
"""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import require_admin
from config import TR_TZ
from database import get_db
from models import Order, OrderItem

router = APIRouter(prefix="/api")


@router.get("/admin/analytics/summary")
async def analytics_summary(
    days: int = 7,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    start = (datetime.now(TR_TZ) - timedelta(days=days)).date().isoformat()

    # Orders by Date
    daily_res = await db.execute(
        select(Order.order_date, func.count(Order.id))
        .where(Order.order_date >= start, Order.status != "iptal")
        .group_by(Order.order_date)
        .order_by(Order.order_date)
    )
    daily_out = []
    total_ords = 0
    for row in daily_res.all():
        daily_out.append({"date": row[0], "orders": row[1]})
        total_ords += row[1]

    # Top items by quantity
    items_res = await db.execute(
        select(OrderItem.name, func.sum(OrderItem.quantity))
        .join(Order)
        .where(Order.order_date >= start, Order.status != "iptal")
        .group_by(OrderItem.name)
        .order_by(desc(func.sum(OrderItem.quantity)))
        .limit(10)
    )
    top_out = [{"name": row[0], "quantity": row[1]} for row in items_res.all()]

    # Top companies by order count
    comp_res = await db.execute(
        select(Order.company_name, func.count(Order.id))
        .where(Order.order_date >= start, Order.status != "iptal")
        .group_by(Order.company_name)
        .order_by(desc(func.count(Order.id)))
        .limit(10)
    )
    comp_out = [{"name": row[0], "orders": row[1]} for row in comp_res.all()]

    # Calculate Total Revenue
    rev_res = await db.execute(
        select(func.sum(Order.total))
        .where(Order.order_date >= start, Order.status != "iptal")
    )
    total_rev = rev_res.scalar() or 0.0

    return {
        "range_days": days,
        "total_revenue": round(total_rev, 2),
        "total_orders": total_ords,
        "daily": daily_out,
        "top_items": top_out,
        "top_companies": comp_out,
    }
