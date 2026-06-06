from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional
import models
import schemas
import random
import string
from datetime import datetime, timedelta

def generate_order_number():
    year = datetime.now().year
    suffix = ''.join(random.choices(string.digits, k=4))
    return f"ORD-{year}-{suffix}"

# ===== DASHBOARD =====
def get_dashboard_stats(db: Session):
    total_customers = db.query(func.count(models.Customer.id)).scalar()
    total_orders = db.query(func.count(models.Order.id)).scalar()
    pending_orders = db.query(func.count(models.Order.id)).filter(models.Order.status == "pending").scalar()
    total_revenue = db.query(func.sum(models.Order.total_amount)).filter(
        models.Order.status.in_(["delivered", "shipped", "processing"])
    ).scalar() or 0
    total_products = db.query(func.count(models.Product.id)).scalar()

    # Recent orders
    recent_orders = db.query(models.Order).order_by(
        models.Order.created_at.desc()
    ).limit(5).all()

    # Top customers
    top_customers = db.query(models.Customer).order_by(
        models.Customer.total_spent.desc()
    ).limit(5).all()

    # Monthly revenue (last 6 months)
    monthly_data = []
    for i in range(5, -1, -1):
        date = datetime.now() - timedelta(days=30 * i)
        month_start = date.replace(day=1, hour=0, minute=0, second=0)
        if i > 0:
            month_end = (datetime.now() - timedelta(days=30 * (i-1))).replace(day=1)
        else:
            month_end = datetime.now()
        
        rev = db.query(func.sum(models.Order.total_amount)).filter(
            models.Order.created_at >= month_start,
            models.Order.created_at < month_end,
            models.Order.status.in_(["delivered", "shipped", "processing"])
        ).scalar() or 0

        monthly_data.append({
            "month": date.strftime("%b"),
            "revenue": float(rev)
        })

    # Order status distribution
    status_counts = {}
    for s in ["pending", "processing", "shipped", "delivered", "cancelled"]:
        count = db.query(func.count(models.Order.id)).filter(models.Order.status == s).scalar()
        status_counts[s] = count

    return {
        "total_customers": total_customers,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "total_revenue": float(total_revenue),
        "total_products": total_products,
        "recent_orders": [
            {
                "id": o.id,
                "order_number": o.order_number,
                "customer_name": o.customer.company_name if o.customer else "N/A",
                "status": o.status,
                "total_amount": o.total_amount,
                "created_at": o.created_at.isoformat() if o.created_at else None
            } for o in recent_orders
        ],
        "top_customers": [
            {
                "id": c.id,
                "company_name": c.company_name,
                "total_spent": c.total_spent,
                "total_orders": c.total_orders,
                "status": c.status
            } for c in top_customers
        ],
        "monthly_revenue": monthly_data,
        "order_status_distribution": status_counts
    }

# ===== CUSTOMERS =====
def get_customers(db: Session, skip=0, limit=100, search=None):
    query = db.query(models.Customer)
    if search:
        query = query.filter(
            or_(
                models.Customer.company_name.ilike(f"%{search}%"),
                models.Customer.contact_name.ilike(f"%{search}%"),
                models.Customer.email.ilike(f"%{search}%"),
                models.Customer.city.ilike(f"%{search}%"),
            )
        )
    return query.order_by(models.Customer.created_at.desc()).offset(skip).limit(limit).all()

def get_customer(db: Session, customer_id: int):
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

def create_customer(db: Session, customer: schemas.CustomerCreate):
    db_customer = models.Customer(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def update_customer(db: Session, customer_id: int, customer: schemas.CustomerCreate):
    db_customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not db_customer:
        return None
    for key, value in customer.dict().items():
        setattr(db_customer, key, value)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def delete_customer(db: Session, customer_id: int):
    db_customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not db_customer:
        return None
    db.delete(db_customer)
    db.commit()
    return True

# ===== PRODUCTS =====
def get_products(db: Session, skip=0, limit=100, category=None):
    query = db.query(models.Product)
    if category:
        query = query.filter(models.Product.category == category)
    return query.order_by(models.Product.created_at.desc()).offset(skip).limit(limit).all()

def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def create_product(db: Session, product: schemas.ProductCreate):
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def update_product(db: Session, product_id: int, product: schemas.ProductCreate):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        return None
    for key, value in product.dict().items():
        setattr(db_product, key, value)
    db.commit()
    db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        return None
    db.delete(db_product)
    db.commit()
    return True

# ===== ORDERS =====
def get_orders(db: Session, skip=0, limit=100, status_filter=None):
    query = db.query(models.Order)
    if status_filter:
        query = query.filter(models.Order.status == status_filter)
    return query.order_by(models.Order.created_at.desc()).offset(skip).limit(limit).all()

def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def create_order(db: Session, order: schemas.OrderCreate):
    order_data = order.dict(exclude={"items"})
    order_data["order_number"] = generate_order_number()
    db_order = models.Order(**order_data)
    db.add(db_order)
    db.flush()

    total = 0
    for item_data in (order.items or []):
        item = models.OrderItem(order_id=db_order.id, **item_data.dict())
        db.add(item)
        total += item_data.subtotal

    db_order.total_amount = total

    # Update customer stats
    customer = db.query(models.Customer).filter(models.Customer.id == order.customer_id).first()
    if customer:
        customer.total_orders += 1
        customer.total_spent += total

    db.commit()
    db.refresh(db_order)
    return db_order

def update_order_status(db: Session, order_id: int, new_status: str):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        return None
    db_order.status = new_status
    db.commit()
    db.refresh(db_order)
    return db_order

def delete_order(db: Session, order_id: int):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        return None
    db.delete(db_order)
    db.commit()
    return True

# ===== INTERACTIONS =====
def get_interactions(db: Session, customer_id=None):
    query = db.query(models.Interaction)
    if customer_id:
        query = query.filter(models.Interaction.customer_id == customer_id)
    return query.order_by(models.Interaction.created_at.desc()).all()

def create_interaction(db: Session, interaction: schemas.InteractionCreate):
    db_interaction = models.Interaction(**interaction.dict())
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    return db_interaction

def delete_interaction(db: Session, interaction_id: int):
    db_interaction = db.query(models.Interaction).filter(models.Interaction.id == interaction_id).first()
    if not db_interaction:
        return None
    db.delete(db_interaction)
    db.commit()
    return True

# ===== SEED DATA =====
def seed_data(db: Session):
    # Check if already seeded
    if db.query(models.Customer).count() > 0:
        return

    customers_data = [
        {"company_name": "Ipak Yo'li Savdo", "contact_name": "Alisher Nazarov", "email": "alisher@ipak.uz", "phone": "+998901234567", "city": "Toshkent", "status": "vip", "total_spent": 85000000, "total_orders": 24},
        {"company_name": "Zafar Tekstil", "contact_name": "Zulfiya Karimova", "email": "zulfiya@zafar.uz", "phone": "+998712345678", "city": "Samarqand", "status": "active", "total_spent": 42000000, "total_orders": 12},
        {"company_name": "Baraka Group", "contact_name": "Bobur Toshmatov", "email": "bobur@baraka.uz", "phone": "+998933456789", "city": "Buxoro", "status": "active", "total_spent": 31000000, "total_orders": 8},
        {"company_name": "Sharq Kiyim", "contact_name": "Nilufar Yusupova", "email": "nilufar@sharq.uz", "phone": "+998974567890", "city": "Farg'ona", "status": "vip", "total_spent": 67000000, "total_orders": 19},
        {"company_name": "Atlas Fashion", "contact_name": "Jasur Mirzayev", "email": "jasur@atlas.uz", "phone": "+998955678901", "city": "Namangan", "status": "active", "total_spent": 28000000, "total_orders": 7},
        {"company_name": "Gulnora Tekstil", "contact_name": "Malika Xoliqova", "email": "malika@gulnora.uz", "phone": "+998906789012", "city": "Andijon", "status": "inactive", "total_spent": 15000000, "total_orders": 4},
    ]

    customers = []
    for c_data in customers_data:
        customer = models.Customer(**c_data)
        db.add(customer)
        customers.append(customer)
    db.flush()

    products_data = [
        {"name": "Ko'ylak (klassik)", "sku": "KOY-001", "category": "Ko'ylaklar", "price": 85000, "stock_quantity": 250},
        {"name": "Shim (biznes)", "sku": "SHI-001", "category": "Shimlar", "price": 120000, "stock_quantity": 180},
        {"name": "Futbolka (oddiy)", "sku": "FUT-001", "category": "Futbolkalar", "price": 45000, "stock_quantity": 500},
        {"name": "Yubka (midi)", "sku": "YUB-001", "category": "Yubkalar", "price": 95000, "stock_quantity": 150},
        {"name": "Jakket (kuz)", "sku": "JAK-001", "category": "Jakketlar", "price": 320000, "stock_quantity": 80},
        {"name": "Palto (qish)", "sku": "PAL-001", "category": "Paltolar", "price": 580000, "stock_quantity": 60},
        {"name": "Sport kostyum", "sku": "SPO-001", "category": "Sport kiyimlar", "price": 175000, "stock_quantity": 120},
        {"name": "Ko'ylak (ayollar)", "sku": "KOY-002", "category": "Ko'ylaklar", "price": 110000, "stock_quantity": 200},
    ]

    for p_data in products_data:
        product = models.Product(**p_data)
        db.add(product)
    db.flush()

    statuses = ["delivered", "delivered", "delivered", "shipped", "processing", "pending"]
    for i, customer in enumerate(customers[:5]):
        order = models.Order(
            order_number=f"ORD-2026-{1000+i}",
            customer_id=customer.id,
            status=statuses[i],
            total_amount=random.choice([4500000, 8200000, 12000000, 6700000, 9800000]),
            shipping_address=f"{customer.city}, O'zbekiston",
        )
        db.add(order)

    interactions_data = [
        {"customer_id": 1, "type": "call", "subject": "Yangi kolleksiya muhokamasi", "description": "2026 yoz kolleksiyasi haqida gaplashildi", "outcome": "Qiziqish bildirdi"},
        {"customer_id": 1, "type": "meeting", "subject": "Shartnoma imzolash", "description": "Yillik shartnoma imzolandi", "outcome": "Muvaffaqiyatli"},
        {"customer_id": 2, "type": "email", "subject": "Narxlar ro'yxati yuborildi", "description": "Yangi narxlar ro'yxati elektron pochta orqali yuborildi", "outcome": "Javob kutilmoqda"},
        {"customer_id": 3, "type": "call", "subject": "To'lov muddati haqida", "description": "30 kunlik kechiktirish kelishib olindi", "outcome": "Kelishuv bo'ldi"},
    ]

    for i_data in interactions_data:
        interaction = models.Interaction(**i_data)
        db.add(interaction)

    db.commit()
