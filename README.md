# TextileCRM 🧵
**Kiyim-kechak ulgurji kompaniyasi uchun CRM tizimi**  
FastAPI + SQLite + Vanilla JS

---

## 📁 Loyiha tuzilmasi

```
crm_project/
├── backend/
│   ├── main.py          # FastAPI ilovasi, barcha API endpointlar
│   ├── database.py      # SQLite ulanish sozlamalari
│   ├── models.py        # SQLAlchemy modellari
│   ├── schemas.py       # Pydantic sxemalari
│   ├── crud.py          # Ma'lumotlar bazasi operatsiyalari
│   └── textile_crm.db   # SQLite bazasi (avtomatik yaratiladi)
├── frontend/
│   ├── index.html       # Asosiy sahifa
│   └── static/
│       ├── css/style.css
│       └── js/app.js
├── requirements.txt
└── README.md
```

---

## 🚀 Ishga tushirish

### 1. Python muhitini sozlash
```bash
cd crm_project
pip install -r requirements.txt
```

### 2. Serverni ishga tushirish
```bash
cd backend
python main.py
```

### 3. Brauzerda ochishasd
```
http://localhost:8000
```

### 4. Demo ma'lumot yuklash
Sidebar pastki qismidagi **"🌱 Demo ma'lumot"** tugmasini bosing.

---

## 🔌 API Endpointlarasdasd

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/api/dashboard/stats` | Dashboard statistikasi |
| GET/POST | `/api/customers` | Mijozlar ro'yxati / qo'shish |
| GET/PUT/DELETE | `/api/customers/{id}` | Mijoz ko'rish/o'zgartirish/o'chirish |
| GET/POST | `/api/orders` | Buyurtmalar |
| PUT | `/api/orders/{id}/status` | Buyurtma statusini yangilash |
| GET/POST | `/api/products` | Mahsulotlar |
| GET/POST | `/api/interactions` | Muloqotlar |
| POST | `/api/seed` | Demo ma'lumot yuklash |

Swagger UI: `http://localhost:8000/docs`

---

## ⚙️ Texnologiyalar

- **Backend:** Python 3.10+, FastAPI, SQLAlchemy, SQLite
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Ma'lumotlar bazasi:** SQLite (fayl: `backend/textile_crm.db`)
- **Shrift:** Sora + JetBrains Mono (Google Fonts)

---

## 🏗️ Asosiy funksiyalar

### CRM
- ✅ Mijozlar (qo'shish, tahrirlash, o'chirish, qidirish)
- ✅ Mijoz tafsilotlari (buyurtmalar tarixi + muloqotlar)
- ✅ VIP / Faol / Nofaol statuslar

### Savdo
- ✅ Buyurtmalar boshqaruvi
- ✅ Status yangilash (pending → processing → shipped → delivered)
- ✅ Filter bo'yicha saralash

### Ombor (WMS)
- ✅ Mahsulotlar katalogi (SKU, kategoriya, narx, zaxira)
- ✅ Zaxira holati ko'rsatgichi (progress bar)

### Dashboard
- ✅ Jonli statistika (mijozlar, buyurtmalar, daromad)
- ✅ Oylik daromad grafigi
- ✅ Buyurtmalar holati donut chart
- ✅ Top 5 mijozlar

### Muloqotlar
- ✅ Qo'ng'iroq, email, uchrashuv, eslatma turlari
- ✅ Natija qayd etish
