"""
Doyuran Güveç — Centralised configuration.
All settings are loaded from .env and exposed as module-level constants.
"""

import os
from pathlib import Path
from datetime import timezone, timedelta

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------- Database ----------
_raw_db_url = os.environ.get("DATABASE_URL", "")
if _raw_db_url.startswith("postgresql"):
    if _raw_db_url.startswith("postgresql://"):
        DATABASE_URL = _raw_db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    else:
        DATABASE_URL = _raw_db_url
else:
    DATABASE_URL = f"sqlite+aiosqlite:///{ROOT_DIR / 'doyuran_guvec.db'}"

# ---------- JWT ----------
JWT_SECRET: str = os.environ.get("JWT_SECRET", "dev-secret-key")
JWT_ALGORITHM: str = "HS256"

# ---------- Admin seed ----------
ADMIN_EMAIL: str = os.environ.get("ADMIN_EMAIL", "admin@test.com")
ADMIN_PASSWORD: str = os.environ.get("ADMIN_PASSWORD", "admin123")

# ---------- App ----------
APP_NAME: str = os.environ.get("APP_NAME", "doyuran-guvec")
COOKIE_SECURE: bool = os.environ.get("COOKIE_SECURE", "false").lower() == "true"

# ---------- Uploads ----------
UPLOADS_DIR: Path = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# ---------- CORS ----------
_origins_raw = os.environ.get("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS: list[str] = [
    o.strip() for o in _origins_raw.split(",") if o.strip()
] if _origins_raw else ["*"]

# ---------- Timezone ----------
TR_TZ = timezone(timedelta(hours=3))

# ---------- Category ordering ----------
CATEGORY_ORDER: list[str] = ["Çorba", "Ana Yemek", "Yan Yemek", "İçecek", "Tatlı"]


def category_rank(cat: str) -> int:
    """Return sort-key for a dish category."""
    if not cat:
        return 999
    try:
        return CATEGORY_ORDER.index(cat)
    except ValueError:
        cat_lower = cat.lower()
        if "çorba" in cat_lower or "corba" in cat_lower or "orb" in cat_lower:
            return 0
        if "ana yemek" in cat_lower:
            return 1
        if "yan yemek" in cat_lower:
            return 2
        if "içecek" in cat_lower or "icecek" in cat_lower:
            return 3
        if "tatlı" in cat_lower or "tatli" in cat_lower or "tatl" in cat_lower:
            return 4
        return 999


def today_iso() -> str:
    """Return today's date as YYYY-MM-DD in Turkey time (UTC+3)."""
    from datetime import datetime
    return datetime.now(TR_TZ).date().isoformat()
