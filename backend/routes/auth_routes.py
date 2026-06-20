"""
Doyuran Güveç — Auth routes.

Endpoints:
  POST /api/auth/register
  POST /api/auth/login      (rate-limited)
  POST /api/auth/logout
  GET  /api/auth/me
  POST /api/auth/refresh     (new — refresh token rotation)
"""

import uuid
from datetime import datetime, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    login_limiter,
    set_auth_cookies,
    verify_password,
    require_admin,
)
from config import JWT_ALGORITHM, JWT_SECRET, ADMIN_EMAIL
from database import get_db
from models import User, SystemSetting
from schemas import LoginIn, RegisterIn, CompanyUpdate

router = APIRouter(prefix="/api")


# ---------- Register ----------
@router.post("/auth/register")
async def register(
    payload: RegisterIn,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    email = payload.email.lower()
    res = await db.execute(select(User).where(User.email == email))
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")

    user_id = str(uuid.uuid4())
    new_user = User(
        id=user_id,
        email=email,
        password_hash=hash_password(payload.password),
        role="company",
        company_name=payload.company_name,
        contact_name=payload.contact_name or "",
        phone=payload.phone or "",
        address=payload.address or "",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(new_user)
    await db.commit()

    access = create_access_token(user_id, email, "company")
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)

    return {
        "id": new_user.id,
        "email": new_user.email,
        "role": new_user.role,
        "company_name": new_user.company_name,
        "contact_name": new_user.contact_name,
        "phone": new_user.phone,
        "address": new_user.address,
        "created_at": new_user.created_at,
    }


# ---------- Login (rate-limited) ----------
@router.post("/auth/login")
async def login(
    payload: LoginIn,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    # Check maintenance mode for non-admin logins
    if payload.email.lower() != ADMIN_EMAIL.lower():
        m_res = await db.execute(select(SystemSetting).where(SystemSetting.key == "maintenance_mode"))
        m_setting = m_res.scalars().first()
        if m_setting and m_setting.value == "true":
            raise HTTPException(
                status_code=503,
                detail="Sistem şu anda bakımdadır. Lütfen daha sonra tekrar deneyiniz."
            )

    client_ip = request.client.host if request.client else "unknown"
    if not login_limiter.check(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Çok fazla giriş denemesi. Lütfen bir dakika bekleyin.",
        )

    res = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = res.scalars().first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")

    access = create_access_token(user.id, user.email, user.role)
    refresh = create_refresh_token(user.id)
    set_auth_cookies(response, access, refresh)

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "company_name": user.company_name,
        "contact_name": user.contact_name,
        "phone": user.phone,
        "address": user.address,
    }


# ---------- Logout ----------
@router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


# ---------- Me ----------
@router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------- Refresh (new) ----------
@router.post("/auth/refresh")
async def refresh_tokens(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Read refresh_token cookie, validate it, issue new access + refresh tokens."""
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token bulunamadı")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Geçersiz token türü")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token süresi doldu")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz refresh token")

    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")

    new_access = create_access_token(user.id, user.email, user.role)
    new_refresh = create_refresh_token(user.id)
    set_auth_cookies(response, new_access, new_refresh)

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "company_name": user.company_name,
        "contact_name": user.contact_name,
        "phone": user.phone,
        "address": user.address,
    }


# ---------- Public: system maintenance status ----------
@router.get("/system/maintenance")
async def get_system_maintenance(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemSetting).where(SystemSetting.key == "maintenance_mode"))
    setting = res.scalars().first()
    return {"maintenance_mode": (setting.value == "true") if setting else False}


# ---------- Admin: system maintenance update ----------
@router.post("/admin/system/maintenance")
async def update_system_maintenance(
    active: bool,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(SystemSetting).where(SystemSetting.key == "maintenance_mode"))
    setting = res.scalars().first()
    if not setting:
        setting = SystemSetting(key="maintenance_mode", value="false")
        db.add(setting)
    
    setting.value = "true" if active else "false"
    await db.commit()
    return {"ok": True, "maintenance_mode": active}


# ---------- Admin: list companies (emails and details) ----------
@router.get("/admin/companies")
async def admin_list_companies(
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(User).where(User.role == "company").order_by(User.company_name))
    companies = res.scalars().all()
    return [
        {
            "id": c.id,
            "email": c.email,  # keeping email since admin needs to contact/identify, password is excluded
            "company_name": c.company_name,
            "contact_name": c.contact_name,
            "phone": c.phone,
            "address": c.address,
            "created_at": c.created_at,
        }
        for c in companies
    ]


# ---------- Admin: update company details ----------
@router.put("/admin/companies/{company_id}")
async def admin_update_company(
    company_id: str,
    payload: CompanyUpdate,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(User).where(User.id == company_id, User.role == "company"))
    company = res.scalars().first()
    if not company:
        raise HTTPException(status_code=404, detail="Firma bulunamadı")

    for k, v in payload.model_dump().items():
        if v is not None:
            setattr(company, k, v)

    await db.commit()
    return {
        "id": company.id,
        "email": company.email,
        "company_name": company.company_name,
        "contact_name": company.contact_name,
        "phone": company.phone,
        "address": company.address,
    }


# ---------- Admin: delete company ----------
@router.delete("/admin/companies/{company_id}")
async def admin_delete_company(
    company_id: str,
    user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(User).where(User.id == company_id, User.role == "company"))
    company = res.scalars().first()
    if not company:
        raise HTTPException(status_code=404, detail="Firma bulunamadı")

    await db.delete(company)
    await db.commit()
    return {"ok": True}
