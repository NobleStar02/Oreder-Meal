# Doyuran Güveç - Restoran Sipariş ve Yönetim Sistemi

Bu proje, Doyuran Güveç restoranı için özel olarak geliştirilmiş, tamamen yerel veritabanı (PostgreSQL/SQLite) tabanlı, termal yazıcı entegrasyonuna sahip tam kapsamlı bir sipariş ve yönetim (POS) sistemidir. Sistem daha önce bulut bağımlı MongoDB altyapısından çıkarılmış olup, tamamen otonom ve **VPS/Coolify** üzerinde yayına alınmaya hazır hale getirilmiştir.

## 🚀 Proje Mimarisi ve Teknoloji Yığını

### 1. Backend (API & Veritabanı)
- **Dil & Çerçeve:** Python 3.11+, FastAPI
- **Veritabanı ORM:** SQLAlchemy 2.0 (Asenkron destekli)
- **Veritabanı Türü:** Varsayılan olarak SQLite (`doyuran_guvec.db`), üretim ortamı için PostgreSQL (`asyncpg` via SQLAlchemy) destekler. 
- **Kimlik Doğrulama:** JWT (JSON Web Tokens) ve `bcrypt` ile şifreleme.
- **Özellikler:** CRUD işlemleri, Analitik hesaplamaları (Günlük ciro, en çok satanlar vb.), RESTful API.
- **Dosya Yükleme:** Ürün resimleri `backend/uploads` klasörüne yerel olarak kaydedilir.

### 2. Frontend (Kullanıcı & Yönetici Paneli)
- **Kütüphane:** React (Create React App tabanlı)
- **Stil & Tasarım:** TailwindCSS, Shadcn UI bileşenleri, Framer Motion (Animasyonlar)
- **Routing:** React Router DOM
- **Durum Yönetimi:** React Context API & LocalStorage
- **Ağ İstekleri:** Axios (API iletişimi)
- **Rol Tabanlı Erişim:** Müşteri sipariş ekranı ve Admin (Yönetim, Menü ekleme/çıkarma, İstatistikler) paneli.

### 3. Yazıcı Servisi (Printer Service)
- **Dil:** Python 3.11+
- **Kütüphaneler:** `pywin32` (Windows yazdırma API'si), `sqlalchemy`
- **İşlev:** Arka planda çalışarak veritabanındaki "yeni" durumunda ve yazdırılmamış siparişleri tarar. Yeni siparişleri otomatik olarak ESC/POS formatında termal yazıcıya (Xprinter XP Q805K) gönderir.

---

## 🛠 Kurulum ve Çalıştırma

### Gereksinimler
- Node.js (v18+)
- Python (3.11+)
- Termal Yazıcı (Windows sürücüsü kurulmuş olmalı)

### 1. Backend'i Başlatmak
Backend klasörüne gidin, kütüphaneleri kurun ve çalıştırın:
```bash
cd backend
pip install -r requirements.txt
pip install sqlalchemy aiosqlite asyncpg
python -m uvicorn server:app --reload --port 8000
```
*(Sunucu başlarken gerekli veritabanı tablolarını ve `admin@test.com` yöneticisini otomatik oluşturacaktır.)*

### 2. Frontend'i Başlatmak
Frontend klasörüne gidin ve React sunucusunu başlatın:
```bash
cd frontend
npm install
npm start
```
*(Tarayıcınızda `http://localhost:3000` adresinde açılacaktır.)*

### 3. Yazıcı Servisini Başlatmak
Yazıcınızın Windows'a kurulu olduğundan emin olun.
`printer_service/main.py` içerisindeki `PRINTER_NAME` değişkenini yazıcınızın adına göre (örneğin `"XP-80C"`) güncelleyin.
```bash
cd printer_service
pip install sqlalchemy
python main.py
```
*(Terminali kapatmadığınız sürece arka planda yeni siparişleri dinlemeye devam edecektir.)*

---

## ☁️ Üretim (Production) / Coolify Deployment
Sistemi bir VPS üzerinde yayına alırken kodda hiçbir değişiklik yapmanıza gerek yoktur.
Sadece sunucudaki (Coolify) ortam değişkenlerine (`.env`) PostgreSQL bilgilerinizi eklemeniz yeterlidir:
```env
DATABASE_URL=postgresql+asyncpg://kullanici:sifre@sunucu_ip:5432/doyuran_guvec
```

*Sistem otomatik olarak SQLite yerine bu veritabanına bağlanacak ve tabloları yaratacaktır.*

---

## 🔒 Varsayılan Giriş Bilgileri
**E-posta:** `admin@test.com`
**Şifre:** `admin123`

Sistemi kullanmaya başlamak için bu bilgilerle giriş yapabilirsiniz.
