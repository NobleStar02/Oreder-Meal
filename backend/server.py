from dotenv import load_dotenv
from pathlib import Path
import shutil
import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Query
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy import Column, String, Float, Boolean, Integer, ForeignKey, select, func, desc, and_

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ========== Configuration ==========
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite+aiosqlite:///./doyuran_guvec.db')
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret-key')
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@test.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')
APP_NAME = os.environ.get('APP_NAME', 'doyuran-guvec')

UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ========== DB ==========
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# ========== Models ==========
class User(Base):
    __tablename__ = 'users'
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String)
    company_name = Column(String)
    contact_name = Column(String)
    phone = Column(String)
    address = Column(String)
    created_at = Column(String)

class MenuItem(Base):
    __tablename__ = 'menu_items'
    id = Column(String, primary_key=True)
    name = Column(String)
    description = Column(String)
    price = Column(Float)
    image_path = Column(String)
    category = Column(String)
    available = Column(Boolean)
    available_date = Column(String, index=True)
    created_at = Column(String)

class Order(Base):
    __tablename__ = 'orders'
    id = Column(String, primary_key=True)
    order_no = Column(Integer)
    user_id = Column(String, index=True)
    company_name = Column(String)
    contact_name = Column(String)
    phone = Column(String)
    address = Column(String)
    total = Column(Float)
    note = Column(String)
    status = Column(String)
    is_revised = Column(Boolean)
    revision_count = Column(Integer)
    last_revised_at = Column(String, nullable=True)
    order_date = Column(String, index=True)
    created_at = Column(String)
    is_printed = Column(Boolean, default=False)
    
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="joined")

class OrderItem(Base):
    __tablename__ = 'order_items'
    id = Column(String, primary_key=True)
    order_id = Column(String, ForeignKey('orders.id'))
    menu_item_id = Column(String)
    name = Column(String)
    price = Column(Float)
    category = Column(String)
    quantity = Column(Integer)
    line_total = Column(Float)
    
    order = relationship("Order", back_populates="items")

class FileRecord(Base):
    __tablename__ = 'files'
    id = Column(String, primary_key=True)
    storage_path = Column(String, unique=True, index=True)
    original_filename = Column(String)
    content_type = Column(String)
    size = Column(Integer)
    is_deleted = Column(Boolean)
    created_at = Column(String)

# ========== Local File Storage ==========
def put_object_local(path: str, data: bytes, content_type: str) -> dict:
    file_path = UPLOADS_DIR / path
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(data)
    return {"path": path, "size": len(data)}

def get_object_local(path: str):
    file_path = UPLOADS_DIR / path
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {path}")
    data = file_path.read_bytes()
    ext = file_path.suffix.lower()
    content_types = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}
    content_type = content_types.get(ext, "application/octet-stream")
    return data, content_type

# ========== Auth Helpers ==========
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=12 * 3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=7 * 24 * 3600, path="/")

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
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
        
        return {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "company_name": user.company_name,
            "contact_name": user.contact_name,
            "phone": user.phone,
            "address": user.address
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi doldu")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Yönetici yetkisi gerekli")
    return user

# ========== Pydantic Schemas ==========
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    company_name: str = Field(min_length=1)
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class MenuItemIn(BaseModel):
    name: str
    description: Optional[str] = ""
    price: float = 0.0
    image_path: Optional[str] = None
    category: Optional[str] = "Ana Yemek"
    available: bool = True
    available_date: Optional[str] = None

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image_path: Optional[str] = None
    category: Optional[str] = None
    available: Optional[bool] = None
    available_date: Optional[str] = None

class OrderItemIn(BaseModel):
    menu_item_id: str
    quantity: int = Field(ge=1)

class OrderIn(BaseModel):
    items: List[OrderItemIn]
    note: Optional[str] = ""

CATEGORY_ORDER = ["Çorba", "Ana Yemek", "Yan Yemek", "İçecek", "Tatlı"]

def _category_rank(cat: str) -> int:
    try:
        return CATEGORY_ORDER.index(cat)
    except ValueError:
        return 999

def today_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()

# ========== App ==========
app = FastAPI(title="Doyuran Güveç API")
api_router = APIRouter(prefix="/api")

# ---------- Auth Routes ----------
@api_router.post("/auth/register")
async def register(payload: RegisterIn, response: Response, db: AsyncSession = Depends(get_db)):
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
        created_at=datetime.now(timezone.utc).isoformat()
    )
    db.add(new_user)
    await db.commit()
    
    access = create_access_token(user_id, email, "company")
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    
    return {
        "id": new_user.id, "email": new_user.email, "role": new_user.role,
        "company_name": new_user.company_name, "contact_name": new_user.contact_name,
        "phone": new_user.phone, "address": new_user.address, "created_at": new_user.created_at
    }

@api_router.post("/auth/login")
async def login(payload: LoginIn, response: Response, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = res.scalars().first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")
        
    access = create_access_token(user.id, user.email, user.role)
    refresh = create_refresh_token(user.id)
    set_auth_cookies(response, access, refresh)
    
    return {
        "id": user.id, "email": user.email, "role": user.role,
        "company_name": user.company_name, "contact_name": user.contact_name,
        "phone": user.phone, "address": user.address
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

# ---------- Upload Routes ----------
@api_router.post("/upload")
async def upload(file: UploadFile = File(...), user: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    if ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
        raise HTTPException(status_code=400, detail="Sadece resim dosyaları kabul edilir")
    
    path = f"{APP_NAME}/menu/{user['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Dosya 5MB'tan büyük olamaz")
        
    content_type = file.content_type or f"image/{ext}"
    result = put_object_local(path, data, content_type)
    
    fr = FileRecord(
        id=str(uuid.uuid4()),
        storage_path=result["path"],
        original_filename=file.filename,
        content_type=content_type,
        size=result.get("size", len(data)),
        is_deleted=False,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    db.add(fr)
    await db.commit()
    return {"path": result["path"]}

@api_router.get("/files/{path:path}")
async def download_file(path: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(FileRecord).where(FileRecord.storage_path == path, FileRecord.is_deleted == False))
    record = res.scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    try:
        data, content_type = get_object_local(path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    return FastAPIResponse(content=data, media_type=record.content_type or content_type)

# ---------- Menu Routes ----------
@api_router.get("/menu/today")
async def menu_today(db: AsyncSession = Depends(get_db)):
    today = today_iso()
    res = await db.execute(select(MenuItem).where(MenuItem.available == True, MenuItem.available_date == today))
    items = res.scalars().all()
    out = [{"id": i.id, "name": i.name, "description": i.description, "price": i.price, 
            "image_path": i.image_path, "category": i.category, "available": i.available, "available_date": i.available_date} for i in items]
    out.sort(key=lambda x: _category_rank(x.get("category", "")))
    return out

@api_router.get("/admin/menu")
async def admin_list_menu(date: Optional[str] = None, user: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    query = select(MenuItem)
    if date:
        query = query.where(MenuItem.available_date == date)
    res = await db.execute(query)
    items = res.scalars().all()
    out = [{"id": i.id, "name": i.name, "description": i.description, "price": i.price, 
            "image_path": i.image_path, "category": i.category, "available": i.available, "available_date": i.available_date} for i in items]
    out.sort(key=lambda x: _category_rank(x.get("category", "")))
    return out

@api_router.post("/admin/menu")
async def admin_create_menu(payload: MenuItemIn, user: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    new_date = payload.available_date or today_iso()
    
    item = MenuItem(
        id=str(uuid.uuid4()),
        name=payload.name,
        description=payload.description or "",
        price=float(payload.price),
        image_path=payload.image_path,
        category=payload.category or "Ana Yemek",
        available=payload.available,
        available_date=new_date,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    db.add(item)
    
    # Auto-deactivate previous dates
    old = await db.execute(select(MenuItem).where(MenuItem.available_date < new_date, MenuItem.available == True))
    for o in old.scalars().all():
        o.available = False
        
    await db.commit()
    return {"id": item.id, "name": item.name, "description": item.description, "price": item.price, "image_path": item.image_path, "category": item.category, "available": item.available, "available_date": item.available_date}

@api_router.put("/admin/menu/{item_id}")
async def admin_update_menu(item_id: str, payload: MenuItemUpdate, user: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Yemek bulunamadı")
        
    for k, v in payload.model_dump().items():
        if v is not None:
            setattr(item, k, v)
            
    await db.commit()
    return {"id": item.id, "name": item.name, "description": item.description, "price": item.price, "image_path": item.image_path, "category": item.category, "available": item.available, "available_date": item.available_date}

@api_router.delete("/admin/menu/{item_id}")
async def admin_delete_menu(item_id: str, user: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Yemek bulunamadı")
    await db.delete(item)
    await db.commit()
    return {"ok": True}

# ---------- Order Routes ----------
def _format_order(o: Order) -> dict:
    return {
        "id": o.id, "order_no": o.order_no, "user_id": o.user_id,
        "company_name": o.company_name, "contact_name": o.contact_name,
        "phone": o.phone, "address": o.address, "total": o.total,
        "note": o.note, "status": o.status, "is_revised": o.is_revised,
        "revision_count": o.revision_count, "last_revised_at": o.last_revised_at,
        "order_date": o.order_date, "created_at": o.created_at,
        "items": [
            {"menu_item_id": i.menu_item_id, "name": i.name, "price": i.price, "category": i.category, "quantity": i.quantity, "line_total": i.line_total}
            for i in o.items
        ]
    }

@api_router.post("/orders")
async def place_order(payload: OrderIn, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
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
            line_total=line_total
        )
        order_items.append(oi)

    order_items.sort(key=lambda x: _category_rank(x.category))
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
        items=order_items
    )
    
    db.add(new_order)
    await db.commit()
    await db.refresh(new_order)
    return _format_order(new_order)

@api_router.put("/orders/{order_id}")
async def update_own_order(order_id: str, payload: OrderIn, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
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
            line_total=line_total
        )
        new_items.append(oi)
        db.add(oi)

    new_items.sort(key=lambda x: _category_rank(x.category))
    
    order.total = round(total, 2)
    order.note = payload.note or ""
    order.is_revised = True
    order.revision_count = (order.revision_count or 0) + 1
    order.last_revised_at = datetime.now(timezone.utc).isoformat()
    order.is_printed = False # Needs re-printing

    await db.commit()
    await db.refresh(order)
    return _format_order(order)

@api_router.get("/orders/me")
async def my_orders(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Order).where(Order.user_id == user["id"]).order_by(desc(Order.created_at)))
    return [_format_order(o) for o in res.scalars().unique().all()]

@api_router.get("/admin/orders")
async def admin_orders(date: Optional[str] = None, status: Optional[str] = None, user: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    query = select(Order)
    if date:
        query = query.where(Order.order_date == date)
    if status:
        query = query.where(Order.status == status)
    query = query.order_by(desc(Order.created_at))
    
    res = await db.execute(query)
    return [_format_order(o) for o in res.scalars().unique().all()]

@api_router.get("/admin/orders/{order_id}")
async def admin_order_detail(order_id: str, user: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Order).where(Order.id == order_id))
    order = res.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    return _format_order(order)

@api_router.put("/admin/orders/{order_id}/status")
async def admin_update_order_status(order_id: str, status: str = Query(...), user: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if status not in ["yeni", "hazirlaniyor", "tamamlandi", "iptal"]:
        raise HTTPException(status_code=400, detail="Geçersiz durum")
    res = await db.execute(select(Order).where(Order.id == order_id))
    order = res.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    order.status = status
    await db.commit()
    return {"ok": True}

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Order).where(Order.id == order_id))
    order = res.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    if user.get("role") != "admin" and order.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Yetkisiz")
    return _format_order(order)

# ---------- Analytics ----------
@api_router.get("/admin/analytics/summary")
async def analytics_summary(days: int = 7, user: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    start = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    
    # Total Revenue & Orders by Date
    daily_res = await db.execute(
        select(Order.order_date, func.sum(Order.total), func.count(Order.id))
        .where(Order.order_date >= start, Order.status != "iptal")
        .group_by(Order.order_date)
        .order_by(Order.order_date)
    )
    daily_out = []
    total_rev = 0
    total_ords = 0
    for row in daily_res.all():
        r = row[1] or 0
        daily_out.append({"date": row[0], "revenue": round(r, 2), "orders": row[2]})
        total_rev += r
        total_ords += row[2]

    # Top items
    items_res = await db.execute(
        select(OrderItem.name, func.sum(OrderItem.quantity), func.sum(OrderItem.line_total))
        .join(Order)
        .where(Order.order_date >= start, Order.status != "iptal")
        .group_by(OrderItem.name)
        .order_by(desc(func.sum(OrderItem.quantity)))
        .limit(10)
    )
    top_out = [{"name": row[0], "quantity": row[1], "revenue": round(row[2] or 0, 2)} for row in items_res.all()]

    # Top companies
    comp_res = await db.execute(
        select(Order.company_name, func.count(Order.id), func.sum(Order.total))
        .where(Order.order_date >= start, Order.status != "iptal")
        .group_by(Order.company_name)
        .order_by(desc(func.sum(Order.total)))
        .limit(10)
    )
    comp_out = [{"name": row[0], "orders": row[1], "revenue": round(row[2] or 0, 2)} for row in comp_res.all()]

    return {
        "range_days": days,
        "total_revenue": round(total_rev, 2),
        "total_orders": total_ords,
        "daily": daily_out,
        "top_items": top_out,
        "top_companies": comp_out,
    }

# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
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
                created_at=datetime.now(timezone.utc).isoformat()
            )
            session.add(u)
            await session.commit()
            logger.info("Admin user seeded in SQL DB.")
        elif not verify_password(ADMIN_PASSWORD, existing.password_hash):
            existing.password_hash = hash_password(ADMIN_PASSWORD)
            await session.commit()
            logger.info("Admin password updated.")

@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()

# Mount router & CORS
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)
