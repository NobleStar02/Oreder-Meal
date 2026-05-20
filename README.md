# Doyuran Güveç — Restoran Sipariş ve Yönetim Sistemi

Doyuran Güveç restoranı için özel olarak geliştirilmiş, yerel veritabanı (SQLite / PostgreSQL) tabanlı, **termal yazıcı entegrasyonuna** sahip tam kapsamlı bir sipariş ve yönetim (POS) sistemidir.

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
│   ├── tests/               # Backend test dosyaları
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
│   │           ├── AdminCatalog.jsx       # Yemek havuzu yönetimi
│   │           ├── AdminOrders.jsx
│   │           ├── AdminManualOrder.jsx   # Manuel sipariş girişi + geçmiş
│   │           └── AdminAnalytics.jsx
│   ├── craco.config.js
│   └── tailwind.config.js
│
├── printer_service/          # Otomatik termal yazıcı servisi
│   └── main.py               # Windows GDI tabanlı POS yazdırma
│
├── start-demo.bat            # Tek tıkla demo başlatıcı (Windows)
└── start-demo.ps1            # PowerShell demo başlatıcı
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
| Mimari | Thread tabanlı kuyruk sistemi (Poller + Worker) |
| Tetikleme | 3 sn aralıklarla DB polling |

---

## ✨ Özellikler

### Müşteri (Firma) Tarafı
- 📋 Günün menüsünü kategorilere ayrılmış görüntüleme
- 🛒 Sepete ekleme, adet yönetimi, sipariş notu
- 🌙 Akşam yemeği isteği — menüden ayrıca ürün seçimi ve adet belirleme
- 📝 Sipariş geçmişi ve detay görüntüleme
- ✏️ "Yeni" durumdaki siparişleri düzenleme (revizyon)
- 🖨️ Tarayıcıdan termal fiş önizleme & yazdırma

### Yönetici (Admin) Tarafı
- 📊 Dashboard — günlük sipariş akışı, en çok tercih edilen yemekler
- 🍽️ Menü yönetimi — yemek ekleme/düzenleme/silme, tarih bazlı yayın
- 📚 Yemek havuzu (katalog) — sık kullanılan yemek şablonları, havuzdan menüye toplu ekleme
- 📦 Sipariş yönetimi — durum güncelleme (Yeni → Hazırlanıyor → Tamamlandı / İptal)
- ✏️ Manuel sipariş girişi — telefon/yüz yüze alınan siparişler için (kişisel bilgiler fişte gösterilmez)
- 📈 Analitik — 7/30/90 günlük sipariş trendleri, firma sıralaması, yemek popülerliği
- 📋 Gün sonu özeti — firma bazlı öğle/akşam kişi sayısı raporu + termal yazdırma
- 🖨️ Termal yazıcıya doğrudan yazdırma

### Yazıcı Servisi
- 🔄 Otomatik — yeni siparişleri algılayıp termal yazıcıya gönderir
- 📄 Kategorize fiş çıktısı (Çorba → Ana Yemek → Yan Yemek → İçecek → Tatlı)
- ⚠️ Düzeltilmiş siparişler için "DÜZELTİLDİ" banner'ı
- 👥 "X KİŞİLİK" — ana yemek adetine göre porsiyon gösterimi
- 🌙 Akşam yemeği isteği fişte ayrı bölüm olarak yazdırılır
- ✏️ Manuel siparişlerde kişisel bilgiler (ad, telefon, adres) fişte gösterilmez
- 📊 Gün sonu özet fişi — sayfa taşma koruması ile çok sayfalı yazdırma desteği
- 🖨️ Yazıcı hata tespiti (kağıt bitimi, çevrimdışı) ve otomatik yeniden deneme

---

## 🛠 Kurulum ve Çalıştırma

### Gereksinimler
- **Node.js** v18+
- **Python** 3.11+
- **Termal Yazıcı** (opsiyonel — Windows sürücüsü kurulmuş olmalı)

### Hızlı Başlangıç (Windows)

`start-demo.bat` dosyasına çift tıklayın. Backend, frontend ve yazıcı servisi otomatik başlar.

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\pip install -r requirements.txt
venv\Scripts\python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

> Sunucu başlarken veritabanı tablolarını ve `admin@test.com` yönetici hesabını otomatik oluşturur.

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

> Tarayıcıda `http://localhost:3000` adresinde açılır. Aynı ağdaki cihazlardan `http://<bilgisayar-ip>:3000` ile erişilebilir.

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

Sistemi VPS üzerinde yayına alırken kodda değişiklik gerekmez. Sadece `backend/.env` dosyasına PostgreSQL bağlantı bilgilerinizi ekleyin:

```env
DATABASE_URL=postgresql+asyncpg://kullanici:sifre@sunucu_ip:5432/doyuran_guvec
JWT_SECRET=guclu-bir-secret-key
ADMIN_EMAIL=admin@test.com
ADMIN_PASSWORD=guclu-bir-sifre
```

Frontend `.env` dosyasında backend adresini güncelleyin:

```env
REACT_APP_BACKEND_URL=https://api.doyuranguvec.com
```

---

## 🔒 Varsayılan Giriş Bilgileri

| Alan | Değer |
|---|---|
| E-posta | `admin@test.com` |
| Şifre | `admin123` |

---

## 📡 API Endpoint'leri

### Kimlik Doğrulama
| Yöntem | Endpoint | Açıklama |
|---|---|---|
| POST | `/api/auth/register` | Yeni firma kaydı |
| POST | `/api/auth/login` | Giriş yapma |
| POST | `/api/auth/logout` | Çıkış yapma |
| GET | `/api/auth/me` | Mevcut kullanıcı bilgisi |

### Menü
| Yöntem | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/menu/today` | Bugünün menüsü (herkese açık) |
| GET | `/api/admin/menu` | Admin menü listesi (tarih filtreli) |
| POST | `/api/admin/menu` | Yeni yemek ekle |
| PUT | `/api/admin/menu/{id}` | Yemek güncelle |
| DELETE | `/api/admin/menu/{id}` | Yemek sil |

### Yemek Havuzu (Katalog)
| Yöntem | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/admin/catalog` | Havuzdaki tüm yemekler |
| POST | `/api/admin/catalog` | Havuza yemek ekle |
| PUT | `/api/admin/catalog/{id}` | Havuzdaki yemeği güncelle |
| DELETE | `/api/admin/catalog/{id}` | Havuzdan sil |

### Siparişler
| Yöntem | Endpoint | Açıklama |
|---|---|---|
| POST | `/api/orders` | Yeni sipariş oluştur |
| PUT | `/api/orders/{id}` | Siparişi düzenle (yalnızca "yeni" durumda) |
| GET | `/api/orders/me` | Kendi siparişlerim |
| GET | `/api/orders/{id}` | Sipariş detayı |
| GET | `/api/admin/orders` | Tüm siparişler (tarih/durum filtreli) |
| GET | `/api/admin/orders/{id}` | Admin sipariş detayı |
| PUT | `/api/admin/orders/{id}/status` | Sipariş durumu güncelle |

### Manuel Sipariş
| Yöntem | Endpoint | Açıklama |
|---|---|---|
| POST | `/api/admin/manual-order` | Manuel sipariş oluştur |
| GET | `/api/admin/manual-orders` | Manuel sipariş geçmişi |
| GET | `/api/admin/manual-orders/summary` | Manuel sipariş gün özeti |
| POST | `/api/admin/manual-orders/summary/print` | Manuel özet fişi yazdır |

### Raporlar
| Yöntem | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/admin/daily-summary` | Günlük firma özeti |
| POST | `/api/admin/daily-summary/print` | Günlük özet fişi yazdır |
| GET | `/api/admin/analytics/summary` | Analitik verileri (7/30/90 gün) |

---

## 🔧 Ortak Helper'lar

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
| `formatTRY(amount)` | Tutar → Türk Lirası formatı |
| `formatApiErrorDetail(detail)` | API hata yanıtlarını kullanıcı dostu mesaja çevirir |
| `CATEGORY_ORDER` | Kategori sıralama referans dizisi |

---

## 📜 Lisans

Bu proje Doyuran Güveç Lokantası için özel olarak geliştirilmiştir.
