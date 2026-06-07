from fastapi import FastAPI, HTTPException, Depends, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn
import os

from database import engine, get_db, Base
import models
import schemas
import crud

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TextileCRM API",
    description="Kiyim-kechak ulgurji kompaniyasi uchun CRM tizimi",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
static_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "static")
app.mount("/static", StaticFiles(directory=static_path), name="static")

frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")

@app.get("/", response_class=FileResponse)
async def root():
    return FileResponse(os.path.join(frontend_path, "index.html"))

@app.get("/pages/{page_name}", response_class=FileResponse)
async def serve_page(page_name: str):
    file_path = os.path.join(frontend_path, f"{page_name}.html")
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Page not found")

# ===== AUTH =====
def verify_token(authorization: Optional[str] = Header(None)):
    if authorization != "Bearer admin-token-secret-123":
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

@app.post("/api/login")
def login(data: schemas.LoginRequest):
    if data.username == "admin" and data.password == "admin":
        return {"token": "admin-token-secret-123"}
    raise HTTPException(status_code=401, detail="Noto'g'ri login yoki parol")

# ===== DASHBOARD =====
@app.get("/api/dashboard/stats", dependencies=[Depends(verify_token)])
def get_dashboard_stats(db: Session = Depends(get_db)):
    return crud.get_dashboard_stats(db)

# ===== CUSTOMERS =====
@app.get("/api/customers", response_model=List[schemas.Customer], dependencies=[Depends(verify_token)])
def list_customers(skip: int = 0, limit: int = 100, search: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.get_customers(db, skip=skip, limit=limit, search=search)

@app.get("/api/customers/{customer_id}", response_model=schemas.Customer, dependencies=[Depends(verify_token)])
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = crud.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Mijoz topilmadi")
    return customer

@app.post("/api/customers", response_model=schemas.Customer, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_token)])
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    return crud.create_customer(db, customer)

@app.put("/api/customers/{customer_id}", response_model=schemas.Customer, dependencies=[Depends(verify_token)])
def update_customer(customer_id: int, customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    updated = crud.update_customer(db, customer_id, customer)
    if not updated:
        raise HTTPException(status_code=404, detail="Mijoz topilmadi")
    return updated

@app.delete("/api/customers/{customer_id}", dependencies=[Depends(verify_token)])
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    deleted = crud.delete_customer(db, customer_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Mijoz topilmadi")
    return {"message": "Mijoz o'chirildi"}

# ===== ORDERS =====
@app.get("/api/orders", response_model=List[schemas.Order], dependencies=[Depends(verify_token)])
def list_orders(skip: int = 0, limit: int = 100, status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.get_orders(db, skip=skip, limit=limit, status_filter=status_filter)

@app.get("/api/orders/{order_id}", response_model=schemas.Order, dependencies=[Depends(verify_token)])
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = crud.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")
    return order

@app.post("/api/orders", response_model=schemas.Order, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_token)])
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    return crud.create_order(db, order)

@app.put("/api/orders/{order_id}/status", dependencies=[Depends(verify_token)])
def update_order_status(order_id: int, status_data: schemas.OrderStatusUpdate, db: Session = Depends(get_db)):
    updated = crud.update_order_status(db, order_id, status_data.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")
    return updated

@app.delete("/api/orders/{order_id}", dependencies=[Depends(verify_token)])
def delete_order(order_id: int, db: Session = Depends(get_db)):
    deleted = crud.delete_order(db, order_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")
    return {"message": "Buyurtma o'chirildi"}

# ===== PRODUCTS =====
@app.get("/api/products", response_model=List[schemas.Product], dependencies=[Depends(verify_token)])
def list_products(skip: int = 0, limit: int = 100, category: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.get_products(db, skip=skip, limit=limit, category=category)

@app.get("/api/products/{product_id}", response_model=schemas.Product, dependencies=[Depends(verify_token)])
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = crud.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    return product

@app.post("/api/products", response_model=schemas.Product, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_token)])
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    return crud.create_product(db, product)

@app.put("/api/products/{product_id}", response_model=schemas.Product, dependencies=[Depends(verify_token)])
def update_product(product_id: int, product: schemas.ProductCreate, db: Session = Depends(get_db)):
    updated = crud.update_product(db, product_id, product)
    if not updated:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    return updated

@app.delete("/api/products/{product_id}", dependencies=[Depends(verify_token)])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    deleted = crud.delete_product(db, product_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    return {"message": "Mahsulot o'chirildi"}

# ===== INTERACTIONS (CRM Records) =====
@app.get("/api/interactions", response_model=List[schemas.Interaction], dependencies=[Depends(verify_token)])
def list_interactions(customer_id: Optional[int] = None, db: Session = Depends(get_db)):
    return crud.get_interactions(db, customer_id=customer_id)

@app.post("/api/interactions", response_model=schemas.Interaction, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_token)])
def create_interaction(interaction: schemas.InteractionCreate, db: Session = Depends(get_db)):
    return crud.create_interaction(db, interaction)

@app.delete("/api/interactions/{interaction_id}", dependencies=[Depends(verify_token)])
def delete_interaction(interaction_id: int, db: Session = Depends(get_db)):
    deleted = crud.delete_interaction(db, interaction_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Yozuv topilmadi")
    return {"message": "Yozuv o'chirildi"}

# ===== SEED DATA =====
@app.post("/api/seed", dependencies=[Depends(verify_token)])
def seed_database(db: Session = Depends(get_db)):
    crud.seed_data(db)
    return {"message": "Ma'lumotlar muvaffaqiyatli yuklandi"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
