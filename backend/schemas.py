"""
Doyuran Güveç — Pydantic schemas.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr


# ---------- Auth ----------
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


# ---------- Menu ----------
class MenuItemIn(BaseModel):
    name: str
    description: Optional[str] = ""
    price: Optional[float] = 0.0
    category: Optional[str] = "Ana Yemek"
    available: bool = True
    available_date: Optional[str] = None


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    available: Optional[bool] = None
    available_date: Optional[str] = None


# ---------- Catalog ----------
class DishCatalogIn(BaseModel):
    name: str
    description: Optional[str] = ""
    category: Optional[str] = "Ana Yemek"


class DishCatalogUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None


# ---------- Orders ----------
class OrderItemIn(BaseModel):
    menu_item_id: str
    quantity: int = Field(ge=1)


class OrderIn(BaseModel):
    items: List[OrderItemIn]
    note: Optional[str] = ""
    meal_time: Optional[str] = ""


class ManualOrderIn(BaseModel):
    company_name: str = Field(min_length=1)
    items: List[OrderItemIn]
    note: Optional[str] = ""
    meal_time: Optional[str] = ""


class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
