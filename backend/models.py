from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class CustomerStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    vip = "vip"

class OrderStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(200), nullable=False)
    contact_name = Column(String(150), nullable=False)
    email = Column(String(200), unique=True, index=True)
    phone = Column(String(50))
    address = Column(String(300))
    city = Column(String(100))
    country = Column(String(100), default="O'zbekiston")
    status = Column(String(20), default="active")
    total_orders = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    orders = relationship("Order", back_populates="customer")
    interactions = relationship("Interaction", back_populates="customer")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    sku = Column(String(100), unique=True, index=True)
    category = Column(String(100))
    price = Column(Float, nullable=False)
    stock_quantity = Column(Integer, default=0)
    unit = Column(String(50), default="dona")
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order_items = relationship("OrderItem", back_populates="product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    status = Column(String(30), default="pending")
    total_amount = Column(Float, default=0.0)
    shipping_address = Column(String(300))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    type = Column(String(50))  # call, email, meeting, note
    subject = Column(String(200))
    description = Column(Text)
    outcome = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="interactions")
