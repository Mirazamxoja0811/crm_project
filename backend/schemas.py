from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# ===== CUSTOMER SCHEMAS =====
class CustomerBase(BaseModel):
    company_name: str
    contact_name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = "O'zbekiston"
    status: Optional[str] = "active"
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    id: int
    total_orders: int
    total_spent: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ===== PRODUCT SCHEMAS =====
class ProductBase(BaseModel):
    name: str
    sku: str
    category: Optional[str] = None
    price: float
    stock_quantity: int = 0
    unit: str = "dona"
    description: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ===== ORDER ITEM SCHEMAS =====
class OrderItemBase(BaseModel):
    product_id: int
    quantity: int
    unit_price: float
    subtotal: float

class OrderItemCreate(OrderItemBase):
    pass

class OrderItem(OrderItemBase):
    id: int
    product: Optional[Product] = None

    class Config:
        from_attributes = True

# ===== ORDER SCHEMAS =====
class OrderBase(BaseModel):
    customer_id: int
    status: Optional[str] = "pending"
    total_amount: float = 0.0
    shipping_address: Optional[str] = None
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    items: Optional[List[OrderItemCreate]] = []

class OrderStatusUpdate(BaseModel):
    status: str

class Order(OrderBase):
    id: int
    order_number: str
    customer: Optional[Customer] = None
    items: List[OrderItem] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ===== INTERACTION SCHEMAS =====
class InteractionBase(BaseModel):
    customer_id: int
    type: str
    subject: str
    description: Optional[str] = None
    outcome: Optional[str] = None

class InteractionCreate(InteractionBase):
    pass

class Interaction(InteractionBase):
    id: int
    customer: Optional[Customer] = None
    created_at: datetime

    class Config:
        from_attributes = True
