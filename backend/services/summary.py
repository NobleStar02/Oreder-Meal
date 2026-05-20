"""
Doyuran Güveç — Shared daily-summary computation.

Eliminates code duplication between:
  • admin_daily_summary / admin_print_daily_summary
  • admin_manual_orders_summary / admin_print_manual_orders_summary
"""

import re
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import TR_TZ
from models import Order, MenuItem


async def compute_daily_summary(
    db: AsyncSession,
    target_date: str,
    *,
    manual_only: bool = False,
    include_items: bool = False,
) -> dict:
    """
    Build a company-level summary for a given date.

    Parameters
    ----------
    db : AsyncSession
    target_date : str  — YYYY-MM-DD
    manual_only : bool — if True, only include orders where is_manual == True
    include_items : bool — if True, attach per-item breakdown to each company
                           (used by the manual summary endpoint)

    Returns
    -------
    dict with keys: date, companies, grand_total
    """

    # Build the query
    conditions = [Order.order_date == target_date, Order.status != "iptal"]
    if manual_only:
        conditions.append(Order.is_manual == True)  # noqa: E712

    query = select(Order).where(*conditions)
    res = await db.execute(query)
    orders = res.scalars().unique().all()

    # Menu-item-name → category map (for meal_time parsing)
    menu_res = await db.execute(select(MenuItem))
    menu_items_map = {
        mi.name.strip().lower(): mi.category for mi in menu_res.scalars().all()
    }

    # Display date: DD.MM.YYYY
    try:
        dt = datetime.strptime(target_date, "%Y-%m-%d")
        display_date = dt.strftime("%d.%m.%Y")
    except Exception:
        display_date = target_date

    summary: dict[str, dict] = {}
    for o in orders:
        name = o.company_name or "Bilinmeyen"
        if name not in summary:
            entry: dict = {
                "company": name,
                "lunch_qty": 0,
                "dinner_qty": 0,
                "total": 0,
                "dinner_items": [],
                "order_count": 0,
            }
            if include_items:
                entry["items"] = []
            summary[name] = entry

        s = summary[name]
        s["order_count"] += 1

        # Lunch person count = total quantity of Ana Yemek items
        ana_yemek_qty = sum(
            i.quantity or 1
            for i in o.items
            if (i.category or "Ana Yemek") == "Ana Yemek"
        )
        s["lunch_qty"] += ana_yemek_qty

        if include_items:
            for i in o.items:
                s["items"].append(
                    {"name": i.name, "category": i.category, "quantity": i.quantity or 1}
                )

        # Dinner items (parsed from meal_time field)
        mt = o.meal_time or ""
        if mt and mt != "Öğle":
            for part in mt.split(","):
                part = part.strip()
                if not part:
                    continue
                m = re.match(r"^(.+?)\s+x(\d+)$", part)
                if m:
                    item_name = m.group(1).strip()
                    qty = int(m.group(2))
                else:
                    item_name = part
                    qty = 1

                cat = menu_items_map.get(item_name.lower())
                if cat == "Ana Yemek":
                    s["dinner_qty"] += qty

                s["dinner_items"].append(part)

        s["total"] = s["lunch_qty"] + s["dinner_qty"]

    result = sorted(summary.values(), key=lambda x: x["total"], reverse=True)
    grand_lunch = sum(s["lunch_qty"] for s in result)
    grand_dinner = sum(s["dinner_qty"] for s in result)

    grand_total: dict = {
        "lunch": grand_lunch,
        "dinner": grand_dinner,
        "total": grand_lunch + grand_dinner,
    }
    if manual_only:
        grand_total["orders"] = sum(s["order_count"] for s in result)

    return {
        "date": display_date,
        "companies": result,
        "grand_total": grand_total,
    }


def get_target_date(date_param: str | None) -> str:
    """Return *date_param* or today in Turkey timezone as YYYY-MM-DD."""
    if date_param:
        return date_param
    return datetime.now(TR_TZ).strftime("%Y-%m-%d")
