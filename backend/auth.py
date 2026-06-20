"""
Doyuran Güveç — Authentication helpers & FastAPI dependencies.

Includes:
  - Password hashing / verification (bcrypt)
  - JWT access & refresh token creation
  - Cookie helpers
  - get_current_user / require_admin dependencies
  - Simple in-memory rate limiter for login
"""

import time
from collections import defaultdict
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import JWT_SECRET, JWT_ALGORITHM, COOKIE_SECURE
from database import get_db
from models import User, SystemSetting


# ============================================================
# Password helpers
# ============================================================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ============================================================
# JWT helpers
# ============================================================

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie(
        "access_token", access,
        httponly=True, secure=COOKIE_SECURE, samesite="lax",
        max_age=12 * 3600, path="/",
    )
    response.set_cookie(
        "refresh_token", refresh,
        httponly=True, secure=COOKIE_SECURE, samesite="lax",
        max_age=7 * 24 * 3600, path="/",
    )


# ============================================================
# FastAPI dependencies
# ============================================================

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Kimlik doğrulanmadı")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Geçersiz token")

        result = await db.execute(select(User).where(User.id == payload["sub"]))
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")

        # Check maintenance mode for non-admin users
        if user.role != "admin":
            m_res = await db.execute(select(SystemSetting).where(SystemSetting.key == "maintenance_mode"))
            m_setting = m_res.scalars().first()
            if m_setting and m_setting.value == "true":
                raise HTTPException(
                    status_code=503,
                    detail="Sistem şu anda bakımdadır. Lütfen daha sonra tekrar deneyiniz."
                )

        return {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "company_name": user.company_name,
            "contact_name": user.contact_name,
            "phone": user.phone,
            "address": user.address,
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi doldu")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Yönetici yetkisi gerekli")
    return user


# ============================================================
# In-memory rate limiter (login endpoint)
# ============================================================

class _RateLimiter:
    """Simple sliding-window rate limiter: max `limit` hits per `window` seconds."""

    def __init__(self, limit: int = 5, window: int = 60):
        self.limit = limit
        self.window = window
        self._hits: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str) -> bool:
        """Return True if the request is allowed, False if rate-limited."""
        now = time.monotonic()
        bucket = self._hits[key]
        # Evict expired entries
        self._hits[key] = [t for t in bucket if now - t < self.window]
        if len(self._hits[key]) >= self.limit:
            return False
        self._hits[key].append(now)
        return True


login_limiter = _RateLimiter(limit=5, window=60)
