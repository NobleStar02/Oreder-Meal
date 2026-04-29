from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
import requests
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Header, Query
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ========== Configuration ==========
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
APP_NAME = os.environ.get('APP_NAME', 'doyuran-guvec')
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ========== DB ==========
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ========== Storage ==========
storage_key: Optional[str] = None

def init_storage() -> str:
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

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
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=12 * 3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=7 * 24 * 3600, path="/")

async def get_current_user(request: Request) -> dict:
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
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi doldu")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Yönetici yetkisi gerekli")
    return user

# ========== Models ==========
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

class UserOut(BaseModel):
    id: str
    email: str
    role: str
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class MenuItemIn(BaseModel):
    name: str
    description: Optional[str] = ""
    price: float
    image_path: Optional[str] = None
    category: Optional[str] = "Ana Yemek"
    available: bool = True
    available_date: Optional[str] = None  # ISO date "YYYY-MM-DD"; None = today

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

# ========== App ==========
app = FastAPI(title="Doyuran Güveç API")
api_router = APIRouter(prefix="/api")

# ---------- Auth Routes ----------
@api_router.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": "company",
        "company_name": payload.company_name,
        "contact_name": payload.contact_name or "",
        "phone": payload.phone or "",
        "address": payload.address or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    access = create_access_token(user_id, email, "company")
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return user_doc

@api_router.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")
    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return user

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
async def upload(file: UploadFile = File(...), user: dict = Depends(require_admin)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    if ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
        raise HTTPException(status_code=400, detail="Sadece resim dosyaları kabul edilir")
    path = f"{APP_NAME}/menu/{user['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Dosya 5MB'tan büyük olamaz")
    content_type = file.content_type or f"image/{ext}"
    result = put_object(path, data, content_type)
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": result["path"]}

@api_router.get("/files/{path:path}")
async def download_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    data, content_type = get_object(path)
    return FastAPIResponse(content=data, media_type=record.get("content_type", content_type))

# ---------- Menu Routes ----------
def today_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()

@api_router.get("/menu/today")
async def menu_today():
    today = today_iso()
    items = await db.menu_items.find(
        {"available": True, "available_date": today},
        {"_id": 0}
    ).to_list(200)
    return items

@api_router.get("/admin/menu")
async def admin_list_menu(date: Optional[str] = None, user: dict = Depends(require_admin)):
    query = {}
    if date:
        query["available_date"] = date
    items = await db.menu_items.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api_router.post("/admin/menu")
async def admin_create_menu(payload: MenuItemIn, user: dict = Depends(require_admin)):
    item = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "description": payload.description or "",
        "price": float(payload.price),
        "image_path": payload.image_path,
        "category": payload.category or "Ana Yemek",
        "available": payload.available,
        "available_date": payload.available_date or today_iso(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.menu_items.insert_one(item)
    item.pop("_id", None)
    return item

@api_router.put("/admin/menu/{item_id}")
async def admin_update_menu(item_id: str, payload: MenuItemUpdate, user: dict = Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok")
    result = await db.menu_items.update_one({"id": item_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Yemek bulunamadı")
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    return item

@api_router.delete("/admin/menu/{item_id}")
async def admin_delete_menu(item_id: str, user: dict = Depends(require_admin)):
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Yemek bulunamadı")
    return {"ok": True}

# ---------- Order Routes ----------
@api_router.post("/orders")
async def place_order(payload: OrderIn, user: dict = Depends(get_current_user)):
    if user.get("role") != "company":
        raise HTTPException(status_code=403, detail="Sadece firmalar sipariş verebilir")
    if not payload.items:
        raise HTTPException(status_code=400, detail="Sipariş boş olamaz")

    item_ids = [it.menu_item_id for it in payload.items]
    menu_items = await db.menu_items.find({"id": {"$in": item_ids}}, {"_id": 0}).to_list(200)
    menu_map = {m["id"]: m for m in menu_items}

    order_items = []
    total = 0.0
    for it in payload.items:
        m = menu_map.get(it.menu_item_id)
        if not m:
            raise HTTPException(status_code=400, detail=f"Yemek bulunamadı: {it.menu_item_id}")
        line_total = m["price"] * it.quantity
        order_items.append({
            "menu_item_id": m["id"],
            "name": m["name"],
            "price": m["price"],
            "quantity": it.quantity,
            "line_total": line_total,
        })
        total += line_total

    # Generate sequential daily order number
    today = today_iso()
    count = await db.orders.count_documents({"order_date": today})
    order_no = count + 1

    order = {
        "id": str(uuid.uuid4()),
        "order_no": order_no,
        "user_id": user["id"],
        "company_name": user.get("company_name", ""),
        "contact_name": user.get("contact_name", ""),
        "phone": user.get("phone", ""),
        "address": user.get("address", ""),
        "items": order_items,
        "total": round(total, 2),
        "note": payload.note or "",
        "status": "yeni",  # yeni | hazirlaniyor | tamamlandi | iptal
        "order_date": today,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order)
    order.pop("_id", None)
    return order

@api_router.get("/orders/me")
async def my_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders

@api_router.get("/admin/orders")
async def admin_orders(
    date: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(require_admin)
):
    query = {}
    if date:
        query["order_date"] = date
    if status:
        query["status"] = status
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@api_router.get("/admin/orders/{order_id}")
async def admin_order_detail(order_id: str, user: dict = Depends(require_admin)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    return order

@api_router.put("/admin/orders/{order_id}/status")
async def admin_update_order_status(order_id: str, status: str = Query(...), user: dict = Depends(require_admin)):
    if status not in ["yeni", "hazirlaniyor", "tamamlandi", "iptal"]:
        raise HTTPException(status_code=400, detail="Geçersiz durum")
    result = await db.orders.update_one({"id": order_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    return {"ok": True}

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    if user.get("role") != "admin" and order["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Yetkisiz")
    return order

# ---------- Analytics ----------
@api_router.get("/admin/analytics/summary")
async def analytics_summary(days: int = 7, user: dict = Depends(require_admin)):
    start = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    pipeline = [
        {"$match": {"order_date": {"$gte": start}, "status": {"$ne": "iptal"}}},
        {"$group": {
            "_id": "$order_date",
            "total_revenue": {"$sum": "$total"},
            "order_count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    daily = await db.orders.aggregate(pipeline).to_list(100)
    daily_out = [{"date": d["_id"], "revenue": round(d["total_revenue"], 2), "orders": d["order_count"]} for d in daily]

    # Top items
    top_pipeline = [
        {"$match": {"order_date": {"$gte": start}, "status": {"$ne": "iptal"}}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.name",
            "quantity": {"$sum": "$items.quantity"},
            "revenue": {"$sum": "$items.line_total"},
        }},
        {"$sort": {"quantity": -1}},
        {"$limit": 10},
    ]
    top = await db.orders.aggregate(top_pipeline).to_list(20)
    top_out = [{"name": t["_id"], "quantity": t["quantity"], "revenue": round(t["revenue"], 2)} for t in top]

    # Top companies
    company_pipeline = [
        {"$match": {"order_date": {"$gte": start}, "status": {"$ne": "iptal"}}},
        {"$group": {
            "_id": "$company_name",
            "orders": {"$sum": 1},
            "revenue": {"$sum": "$total"},
        }},
        {"$sort": {"revenue": -1}},
        {"$limit": 10},
    ]
    companies = await db.orders.aggregate(company_pipeline).to_list(20)
    companies_out = [{"name": c["_id"], "orders": c["orders"], "revenue": round(c["revenue"], 2)} for c in companies]

    total_revenue = sum(d["revenue"] for d in daily_out)
    total_orders = sum(d["orders"] for d in daily_out)
    return {
        "range_days": days,
        "total_revenue": round(total_revenue, 2),
        "total_orders": total_orders,
        "daily": daily_out,
        "top_items": top_out,
        "top_companies": companies_out,
    }

# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.menu_items.create_index("id", unique=True)
    await db.menu_items.create_index("available_date")
    await db.orders.create_index("id", unique=True)
    await db.orders.create_index("user_id")
    await db.orders.create_index("order_date")

    # Seed admin
    existing = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL.lower(),
            "password_hash": hash_password(ADMIN_PASSWORD),
            "role": "admin",
            "company_name": "Doyuran Güveç Lokantası",
            "contact_name": "Yönetici",
            "phone": "",
            "address": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin user seeded.")
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one(
            {"email": ADMIN_EMAIL.lower()},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}}
        )
        logger.info("Admin password updated.")

    # Init storage
    try:
        init_storage()
        logger.info("Storage initialized.")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

@app.on_event("shutdown")
async def shutdown():
    client.close()

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
