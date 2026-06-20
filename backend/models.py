"""
Doyuran Güveç — SQLAlchemy models.
"""

from sqlalchemy.orm import relationship
from sqlalchemy import Column, String, Float, Boolean, Integer, ForeignKey

from database import Base


class User(Base):
    __tablename__ = "users"
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
    __tablename__ = "menu_items"
    id = Column(String, primary_key=True)
    name = Column(String)
    description = Column(String)
    price = Column(Float)
    category = Column(String)
    available = Column(Boolean)
    available_date = Column(String, index=True)
    created_at = Column(String)


class DishCatalog(Base):
    __tablename__ = "dish_catalog"
    id = Column(String, primary_key=True)
    name = Column(String)
    description = Column(String)
    category = Column(String)
    created_at = Column(String)


class Order(Base):
    __tablename__ = "orders"
    id = Column(String, primary_key=True)
    order_no = Column(Integer)
    user_id = Column(String, ForeignKey("users.id"), index=True)
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
    meal_time = Column(String, default="")
    is_manual = Column(Boolean, default=False)

    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="joined",
    )


class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(String, primary_key=True)
    order_id = Column(String, ForeignKey("orders.id"))
    menu_item_id = Column(String)
    name = Column(String)
    price = Column(Float)
    category = Column(String)
    quantity = Column(Integer)
    line_total = Column(Float)

    order = relationship("Order", back_populates="items")


class PrintJob(Base):
    __tablename__ = "print_jobs"
    id = Column(String, primary_key=True)
    job_type = Column(String)  # 'daily_summary', 'manual_summary'
    payload = Column(String)   # JSON content
    is_printed = Column(Boolean, default=False)
    created_at = Column(String)


class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String, primary_key=True)
    value = Column(String)

