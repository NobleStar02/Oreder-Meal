# Doyuran Güveç — Restoran Sipariş ve Yönetim Sistemi

Doyuran Güveç restoranı için özel olarak geliştirilmiş, tamamen yerel veritabanı (SQLite / PostgreSQL) tabanlı, **termal yazıcı entegrasyonuna** sahip tam kapsamlı bir sipariş ve yönetim (POS) sistemidir.

Sistem bulut bağımlılıklarından arındırılmış olup, tamamen otonom çalışır ve **VPS / Coolify** üzerinde yayına alınmaya hazırdır.

---

## 🚀 Proje Mimarisi

```
Oreder-Meal/
├── backend/                 # FastAPI sunucusu
│   ├── server.py            # Ana API — tüm endpoint'ler tek dosyada
│   ├── requirements.txt
│   ├── .env                 # Ortam değişkenleri
│   ├── doyuran_guvec.db     # SQLite veritabanı (otomatik oluşur)
│   └── uploads/             # Dosya yükleme dizini
│
├── frontend/                # React (CRA + CRACO) istemci uygulaması
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.js       # Axios client, ortak helper'lar, sabitler
│   │   │   ├── auth.jsx     # AuthContext (JWT cookie tabanlı)
│   │   │   ├── cart.jsx     # CartContext (LocalStorage ile persist)
│   │   │   └── utils.js     # Tailwind cn() yardımcı fonksiyonu
│   │   ├── components/
│   │   │   ├── NavBar.jsx
│   │   │   ├── EditOrderDialog.jsx
│   │   │   └── ui/          # shadcn/ui bileşen kütüphanesi
│   │   └── pages/
│   │       ├── Landing.jsx
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── MenuPage.jsx
│   │       ├── OrdersPage.jsx
│   │       ├── PrintReceipt.jsx   # Termal fiş önizleme & tarayıcıdan yazdırma
│   │       └── admin/
│   │           ├── AdminLayout.jsx
│   │           ├── AdminDashboard.jsx
│   │           ├── AdminMenu.jsx
│   │           ├── AdminOrders.jsx
│   │           └── AdminAnalytics.jsx
│   └── tailwind.config.js
│
└── printer_service/          # Otomatik termal yazıcı servisi
    └── main.py               # Windows GDI tabanlı POS yazdırma
```

---

## 🧰 Teknoloji Yığını

### Backend
| Bileşen | Teknoloji |
|---|---|
| Dil & Çerçeve | Python 3.11+, **FastAPI** |
| Veritabanı ORM | SQLAlchemy 2.0 (Async) |
| Veritabanı | SQLite (geliştirme) / PostgreSQL (üretim) |
| Kimlik Doğrulama | JWT (`PyJWT`) + `bcrypt` |
| Yaşam Döngüsü | Modern `lifespan` context manager |

### Frontend
| Bileşen | Teknoloji |
|---|---|
| Kütüphane | React 19 (CRA + CRACO) |
| Stil | TailwindCSS 3, shadcn/ui (Radix tabanlı) |
| Tipografi | Bricolage Grotesque, Manrope, JetBrains Mono |
| Routing | React Router DOM v7 |
| Durum Yönetimi | React Context API + LocalStorage |
| API İstemcisi | Axios (cookie tabanlı withCredentials) |
| Bildirimler | Sonner (toast) |
| Grafikler | Recharts |

### Yazıcı Servisi
| Bileşen | Teknoloji |
|---|---|
| Dil | Python 3.11+ |
| Yazdırma | Windows GDI (`pywin32` — `win32ui`, `win32print`) |
| Font | Arial (Türkçe karakter desteği) |
| Tetikleme | 3 sn aralıklarla DB polling |

---

## ✨ Özellikler

### Müşteri (Firma) Tarafı
- 📋 Günün menüsünü kategorilere ayrılmış görüntüleme
- 🛒 Sepete ekleme, adet yönetimi, sipariş notu
- 📝 Sipariş geçmişi ve detay görüntüleme
- ✏️ "Yeni" durumdaki siparişleri düzenleme (revizyon)
- 🖨️ Tarayıcıdan termal fiş önizleme & yazdırma

### Yönetici (Admin) Tarafı
- 📊 Dashboard — günlük sipariş akışı, en çok tercih edilen yemekler
- 🍽️ Menü yönetimi — yemek ekleme/düzenleme/silme, tarih bazlı yayın
- 📦 Sipariş yönetimi — durum güncelleme (Yeni → Hazırlanıyor → Tamamlandı / İptal)
- 📈 Analitik — 7/30/90 günlük sipariş trendleri, firma sıralaması, yemek popülerliği
- 🖨️ Termal yazıcıya doğrudan yazdırma

### Yazıcı Servisi
- 🔄 Otomatik — yeni siparişleri algılayıp termal yazıcıya gönderir
- 📄 Kategorize fiş çıktısı (Çorba → Ana Yemek → Yan Yemek → İçecek → Tatlı)
- ⚠️ Düzeltilmiş siparişler için "DÜZELTİLDİ" banner'ı
- 👥 "X KİŞİLİK" — ana yemek adetine göre porsiyon gösterimi

---

## 🛠 Kurulum ve Çalıştırma

### Gereksinimler
- **Node.js** v18+
- **Python** 3.11+
- **Termal Yazıcı** (opsiyonel — Windows sürücüsü kurulmuş olmalı)

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn server:app --reload --port 8000
```

> Sunucu başlarken veritabanı tablolarını ve `admin@test.com` yönetici hesabını otomatik oluşturur.

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

> Tarayıcıda `http://localhost:3000` adresinde açılır.

### 3. Yazıcı Servisi (opsiyonel)

`printer_service/main.py` içindeki `PRINTER_NAME` değişkenini yazıcınızın adına göre güncelleyin:

```bash
cd printer_service
pip install sqlalchemy pywin32 python-dotenv
python main.py
```

> Terminal açık kaldığı sürece yeni siparişleri otomatik dinler ve yazdırır.

---

## ☁️ Üretim Ortamı (Production)

Sistemi VPS üzerinde yayına alırken kodda değişiklik gerekmez. Sadece `.env` dosyasına PostgreSQL bağlantı bilgilerinizi ekleyin:

```env
DATABASE_URL=postgresql+asyncpg://kullanici:sifre@sunucu_ip:5432/doyuran_guvec
JWT_SECRET=guclu-bir-secret-key
ADMIN_EMAIL=admin@test.com
ADMIN_PASSWORD=guclu-bir-sifre
```

---

## 🔒 Varsayılan Giriş Bilgileri

| Alan | Değer |
|---|---|
| E-posta | `admin@test.com` |
| Şifre | `admin123` |

---

## 🔧 Kod Mimarisi ve Ortak Helper'lar

Tekrar eden kod kalıpları `frontend/src/lib/api.js` içinde merkezi olarak yönetilir:

| Helper | Açıklama |
|---|---|
| `groupByCategory(items)` | Sipariş/menü öğelerini kategorilere göre gruplar |
| `sortByCategory(arr)` | Kategori sırasına göre sıralar |
| `categoryRank(cat)` | Kategori öncelik sırasını döndürür |
| `todayISO()` | Bugünün tarihini `YYYY-MM-DD` formatında döndürür |
| `STATUS_LABELS` | Sipariş durumu etiketleri ve CSS sınıfları |
| `formatDateTR(iso)` | ISO tarih → Türkçe format |
| `formatTimeTR(iso)` | ISO saat → Türkçe format |
| `formatApiErrorDetail(detail)` | API hata yanıtlarını kullanıcı dostu mesaja çevirir |

---

## 📜 Lisans

Bu proje Doyuran Güveç Lokantası için özel olarak geliştirilmiştir.
