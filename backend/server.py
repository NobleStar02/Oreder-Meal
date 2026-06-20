"""
Doyuran Güveç API — Application entry-point.

This file only wires together:
  • FastAPI app with lifespan (table creation, migrations, admin seed)
  • Route modules
  • CORS middleware
"""

import uuid
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy import text as sa_text, select

from config import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    ALLOWED_ORIGINS,
    DATABASE_URL,
)
from database import AsyncSessionLocal, Base, engine
from models import User  # noqa: F401 — ensure models are registered on Base
from models import MenuItem, DishCatalog, Order, OrderItem, PrintJob, SystemSetting  # noqa: F401
from auth import hash_password, verify_password

# Route modules
from routes.auth_routes import router as auth_router
from routes.menu_routes import router as menu_router
from routes.catalog_routes import router as catalog_router
from routes.order_routes import router as order_router
from routes.manual_routes import router as manual_router
from routes.analytics_routes import router as analytics_router
from routes.upload_routes import router as upload_router
from routes.printer_routes import router as printer_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ============================================================
# Lifespan: startup / shutdown
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Auto-migrate: add meal_time column if missing
        if DATABASE_URL.startswith("sqlite"):
            try:
                await conn.execute(sa_text("ALTER TABLE orders ADD COLUMN meal_time TEXT DEFAULT ''"))
                logger.info("Migration: meal_time column added to orders table.")
            except Exception:
                pass  # Column already exists
            # Auto-migrate: add is_manual column if missing
            try:
                await conn.execute(sa_text("ALTER TABLE orders ADD COLUMN is_manual BOOLEAN DEFAULT 0"))
                logger.info("Migration: is_manual column added to orders table.")
            except Exception:
                pass  # Column already exists
            # Clean up legacy 'Öğle' values
            try:
                await conn.execute(sa_text("UPDATE orders SET meal_time = '' WHERE meal_time = 'Öğle'"))
            except Exception:
                pass

    # Seed admin user
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.email == ADMIN_EMAIL.lower()))
        existing = res.scalars().first()
        if not existing:
            u = User(
                id=str(uuid.uuid4()),
                email=ADMIN_EMAIL.lower(),
                password_hash=hash_password(ADMIN_PASSWORD),
                role="admin",
                company_name="Doyuran Güveç Lokantası",
                contact_name="Yönetici",
                phone="",
                address="",
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            session.add(u)
            await session.commit()
            logger.info("Admin user seeded in SQL DB.")
        elif not verify_password(ADMIN_PASSWORD, existing.password_hash):
            existing.password_hash = hash_password(ADMIN_PASSWORD)
            await session.commit()
            logger.info("Admin password updated.")
        # Delete old default admin if the email has changed
        if ADMIN_EMAIL.lower() != "admin@test.com":
            try:
                await session.execute(sa_text("DELETE FROM users WHERE email = 'admin@test.com'"))
                await session.commit()
                logger.info("Old default admin user 'admin@test.com' deleted from DB.")
            except Exception as e:
                logger.error(f"Failed to delete old admin: {e}")

        # Seed system settings (maintenance_mode)
        try:
            res_settings = await session.execute(select(SystemSetting).where(SystemSetting.key == "maintenance_mode"))
            existing_setting = res_settings.scalars().first()
            if not existing_setting:
                setting = SystemSetting(key="maintenance_mode", value="false")
                session.add(setting)
                await session.commit()
                logger.info("Default system setting 'maintenance_mode' seeded as 'false'.")
        except Exception as e:
            logger.error(f"Failed to seed system settings: {e}")

    yield

    # --- Shutdown ---
    await engine.dispose()


# ============================================================
# FastAPI app
# ============================================================

app = FastAPI(title="Doyuran Güveç API", lifespan=lifespan)

@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "backend-api"}

# Mount route modules
app.include_router(auth_router)
app.include_router(menu_router)
app.include_router(catalog_router)
app.include_router(order_router)
app.include_router(manual_router)
app.include_router(analytics_router)
app.include_router(upload_router)
app.include_router(printer_router)

# CORS — reads ALLOWED_ORIGINS from .env (comma-separated), defaults to ["*"]
# If ALLOWED_ORIGINS contains "*" or is empty, use allow_origin_regex to allow any origin with credentials.
if not ALLOWED_ORIGINS or "*" in ALLOWED_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origin_regex=r"https?://.*",
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=ALLOWED_ORIGINS,
        allow_methods=["*"],
        allow_headers=["*"],
    )
