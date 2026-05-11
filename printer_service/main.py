import os
import time
import queue
import threading
import logging
from pathlib import Path
from sqlalchemy import create_engine, select, event, Column, String, Boolean, Integer, Float, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from dotenv import load_dotenv

try:
    import win32print
except ImportError:
    print("UYARI: pywin32 modulu yuklu degil. Yazdirma yapilamaz.")
    win32print = None

ROOT_DIR = Path(__file__).parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
load_dotenv(BACKEND_DIR / ".env")

# DB URL — backend ile ayni .env'den okur, async driver'i sync'e cevirir
_raw_url = os.environ.get('DATABASE_URL', '')
DB_FILE = BACKEND_DIR / "doyuran_guvec.db"

if _raw_url.startswith("postgresql"):
    # PostgreSQL: asyncpg → psycopg2 (sync)
    DATABASE_URL = _raw_url.replace("postgresql+asyncpg", "postgresql")
else:
    # SQLite: her zaman mutlak yol kullan
    DATABASE_URL = f"sqlite:///{DB_FILE}"


PRINTER_NAME = "POSPrinter POS80"

def _turkish_upper(text):
    """Türkçe karakter desteğiyle büyük harfe çevir (i→İ, ı→I vb.)."""
    if not text:
        return text
    tr_map = str.maketrans("abcçdefgğhıijklmnoöprsştuüvyz", "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ")
    return text.translate(tr_map).upper()

Base = declarative_base()

# ---------- Models (backend/server.py ile senkronize) ----------

class Order(Base):
    __tablename__ = 'orders'
    id = Column(String, primary_key=True)
    order_no = Column(Integer)
    user_id = Column(String)
    company_name = Column(String)
    contact_name = Column(String)
    phone = Column(String)
    address = Column(String)
    total = Column(Float)
    note = Column(String)
    status = Column(String)
    is_revised = Column(Boolean)
    revision_count = Column(Integer)
    last_revised_at = Column(String)
    order_date = Column(String)
    created_at = Column(String)
    is_printed = Column(Boolean)
    meal_time = Column(String)
    is_manual = Column(Boolean, default=False)
    
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = 'order_items'
    id = Column(String, primary_key=True)
    order_id = Column(String, ForeignKey('orders.id'))
    menu_item_id = Column(String)
    name = Column(String)
    price = Column(Float)
    category = Column(String)
    quantity = Column(Integer)
    line_total = Column(Float)
    
    order = relationship("Order", back_populates="items")


def _monitor_spooler(printer_name):
    if not win32print:
        return True
    try:
        hprinter = win32print.OpenPrinter(printer_name)
    except Exception as e:
        return False
        
    try:
        while True:
            jobs = win32print.EnumJobs(hprinter, 0, -1, 1)
            if not jobs:
                return True
            for job in jobs:
                status = job.get("Status", 0)
                # 64: PAPER_OUT, 2: ERROR, 32: OFFLINE, 1024: USER_INTERVENTION
                if (status & 64) or (status & 2) or (status & 32) or (status & 1024):
                    for j in jobs:
                        try:
                            win32print.SetJob(hprinter, j["JobId"], 0, None, win32print.JOB_CONTROL_CANCEL)
                        except Exception:
                            pass
                    return False
            time.sleep(1)
    finally:
        win32print.ClosePrinter(hprinter)


def print_summary_receipt(summary_data, printer_name):
    """Günlük özet fişi yazdır."""
    if not win32print:
        print("SIMULASYON: win32print kurulu degil.")
        return True

    try:
        import win32ui
        import win32con

        hDC = win32ui.CreateDC()
        hDC.CreatePrinterDC(printer_name)
        hDC.SetMapMode(win32con.MM_TEXT)
        horzres = hDC.GetDeviceCaps(win32con.HORZRES)
        vertres = hDC.GetDeviceCaps(win32con.VERTRES)
        # Sayfa taşma koruması: sayfanın %85'ini geçince yeni sayfa aç
        page_threshold = int(vertres * 0.85) if vertres > 500 else 99999

        # Fontlar
        def make_font(size, bold=False, name="Arial"):
            return win32ui.CreateFont({
                "name": name, "height": size,
                "weight": 700 if bold else 400,
            })

        font_bold = make_font(40, bold=True)
        font_normal = make_font(28)
        font_small = make_font(24)
        font_small_bold = make_font(24, bold=True)
        font_large = make_font(48, bold=True)

        def draw_centered(text, y, font):
            hDC.SelectObject(font)
            w, h = hDC.GetTextExtent(text)
            hDC.TextOut((horzres - w) // 2, y, text)
            return y + h + 2

        def draw_left(text, y, font):
            hDC.SelectObject(font)
            _, h = hDC.GetTextExtent(text)
            hDC.TextOut(10, y, text)
            return y + h + 2

        def draw_left_right(left, right, y, font):
            hDC.SelectObject(font)
            _, h = hDC.GetTextExtent(left)
            wr, _ = hDC.GetTextExtent(right)
            hDC.TextOut(10, y, left)
            hDC.TextOut(horzres - wr - 10, y, right)
            return y + h + 2

        def draw_dashed(y):
            hDC.SelectObject(font_small)
            line = "-" * 48
            _, h = hDC.GetTextExtent(line)
            hDC.TextOut(10, y, line)
            return y + h + 2

        def new_page(y):
            """Sayfa taştığında yeni sayfa başlat ve continuation header ekle."""
            hDC.EndPage()
            hDC.StartPage()
            y = 10
            y = draw_centered("GÜN ÖZETİ (devam)", y, font_small_bold)
            y = draw_dashed(y)
            return y

        hDC.StartDoc("GunOzeti")
        hDC.StartPage()

        y = 10
        y = draw_centered("DOYURAN GÜVEÇ LOKANTASI", y, font_bold)
        y = draw_centered("GÜN ÖZETİ", y, font_small_bold)
        y += 5
        y = draw_centered(summary_data.get("date", ""), y, font_small)
        y += 5
        y = draw_dashed(y)

        companies = summary_data.get("companies", [])
        for c in companies:
            # Sayfa taşma kontrolü: bir firma bloğu (~100px) sığmayacaksa yeni sayfa
            if y > page_threshold:
                y = new_page(y)

            name = _turkish_upper(c.get("company", ""))
            lunch = c.get("lunch_qty", 0)
            dinner = c.get("dinner_qty", 0)
            total = c.get("total", 0)

            y = draw_left_right(name[:30], f"TOPLAM: {total}", y, font_small_bold)
            y = draw_left_right("  Öğle", f"x {lunch}", y, font_normal)
            if dinner > 0:
                y = draw_left_right("  Akşam", f"x {dinner}", y, font_normal)
            y += 8

        y = draw_dashed(y)

        # Genel toplam için sayfa kontrolü
        if y > page_threshold:
            y = new_page(y)

        gt = summary_data.get("grand_total", {})
        y = draw_centered("GENEL TOPLAM", y, font_bold)
        y += 5
        y = draw_left_right("Öğle", str(gt.get("lunch", 0)), y, font_small_bold)
        if gt.get("dinner", 0) > 0:
            y = draw_left_right("Akşam", str(gt.get("dinner", 0)), y, font_small_bold)
        
        hDC.SelectObject(font_large)
        total_text = str(gt.get("total", 0))
        w, h = hDC.GetTextExtent(total_text)
        hDC.TextOut((horzres - w) // 2, y + 5, total_text)
        y += h + 15

        y = draw_dashed(y)
        y = draw_centered("doyuranguvec.com", y, font_small)

        y += 100
        hDC.TextOut(0, y, " ")

        hDC.EndPage()
        hDC.EndDoc()
        hDC.DeleteDC()
        return _monitor_spooler(printer_name)
    except Exception as e:
        log.error(f"Ozet fisi yazdirma hatasi: {e}")
        return False


def print_manual_summary_receipt(summary_data, printer_name):
    """Manuel sipariş gün sonu özet fişi yazdır."""
    if not win32print:
        print("SIMULASYON: win32print kurulu degil.")
        return True

    try:
        import win32ui
        import win32con

        hDC = win32ui.CreateDC()
        hDC.CreatePrinterDC(printer_name)
        hDC.SetMapMode(win32con.MM_TEXT)
        horzres = hDC.GetDeviceCaps(win32con.HORZRES)
        vertres = hDC.GetDeviceCaps(win32con.VERTRES)
        # Sayfa taşma koruması: sayfanın %85'ini geçince yeni sayfa aç
        page_threshold = int(vertres * 0.85) if vertres > 500 else 99999

        # Fontlar
        def make_font(size, bold=False, name="Arial"):
            return win32ui.CreateFont({
                "name": name, "height": size,
                "weight": 700 if bold else 400,
            })

        font_bold = make_font(40, bold=True)
        font_normal = make_font(28)
        font_small = make_font(24)
        font_small_bold = make_font(24, bold=True)
        font_large = make_font(48, bold=True)

        def draw_centered(text, y, font):
            hDC.SelectObject(font)
            w, h = hDC.GetTextExtent(text)
            hDC.TextOut((horzres - w) // 2, y, text)
            return y + h + 2

        def draw_left(text, y, font):
            hDC.SelectObject(font)
            _, h = hDC.GetTextExtent(text)
            hDC.TextOut(10, y, text)
            return y + h + 2

        def draw_left_right(left, right, y, font):
            hDC.SelectObject(font)
            _, h = hDC.GetTextExtent(left)
            wr, _ = hDC.GetTextExtent(right)
            hDC.TextOut(10, y, left)
            hDC.TextOut(horzres - wr - 10, y, right)
            return y + h + 2

        def draw_dashed(y):
            hDC.SelectObject(font_small)
            line = "-" * 48
            _, h = hDC.GetTextExtent(line)
            hDC.TextOut(10, y, line)
            return y + h + 2

        def new_page(y):
            """Sayfa taştığında yeni sayfa başlat ve continuation header ekle."""
            hDC.EndPage()
            hDC.StartPage()
            y = 10
            y = draw_centered("MANUEL ÖZETİ (devam)", y, font_small_bold)
            y = draw_dashed(y)
            return y

        hDC.StartDoc("ManuelOzet")
        hDC.StartPage()

        y = 10
        y = draw_centered("DOYURAN GÜVEÇ LOKANTASI", y, font_bold)
        y = draw_centered("MANUEL SİPARİŞ ÖZETİ", y, font_small_bold)
        y += 5
        y = draw_centered(summary_data.get("date", ""), y, font_small)
        y += 5
        y = draw_dashed(y)

        companies = summary_data.get("companies", [])
        for c in companies:
            # Sayfa taşma kontrolü
            if y > page_threshold:
                y = new_page(y)

            name = _turkish_upper(c.get("company", ""))
            lunch = c.get("lunch_qty", 0)
            dinner = c.get("dinner_qty", 0)
            total = c.get("total", 0)

            y = draw_left_right(name[:30], f"TOPLAM: {total}", y, font_small_bold)
            y = draw_left_right("  Öğle", f"x {lunch}", y, font_normal)
            if dinner > 0:
                y = draw_left_right("  Akşam", f"x {dinner}", y, font_normal)
            y += 8

        y = draw_dashed(y)

        # Genel toplam için sayfa kontrolü
        if y > page_threshold:
            y = new_page(y)

        gt = summary_data.get("grand_total", {})
        y = draw_centered("GENEL TOPLAM", y, font_bold)
        y += 5
        y = draw_left_right("Öğle", str(gt.get("lunch", 0)), y, font_small_bold)
        if gt.get("dinner", 0) > 0:
            y = draw_left_right("Akşam", str(gt.get("dinner", 0)), y, font_small_bold)

        hDC.SelectObject(font_large)
        total_text = str(gt.get('total', 0))
        w, h = hDC.GetTextExtent(total_text)
        hDC.TextOut((horzres - w) // 2, y + 5, total_text)
        y += h + 15

        y = draw_dashed(y)
        y = draw_centered("doyuranguvec.com", y, font_small)

        y += 100
        hDC.TextOut(0, y, " ")

        hDC.EndPage()
        hDC.EndDoc()
        hDC.DeleteDC()
        return _monitor_spooler(printer_name)
    except Exception as e:
        log.error(f"Manuel ozet fisi yazdirma hatasi: {e}")
        return False


def print_receipt(order, printer_name):
    if not win32print:
        print("SIMULASYON: win32print kurulu degil.")
        return True

    try:
        import win32ui
        import win32con
        from datetime import datetime, timezone, timedelta
        
        hDC = win32ui.CreateDC()
        hDC.CreatePrinterDC(printer_name)
        
        horzres = hDC.GetDeviceCaps(win32con.HORZRES)
        
        font_company = win32ui.CreateFont({"name": "Arial", "height": 56, "weight": 700})
        font_large = win32ui.CreateFont({"name": "Arial", "height": 42, "weight": 700})
        font_normal = win32ui.CreateFont({"name": "Arial", "height": 28, "weight": 400})
        font_bold = win32ui.CreateFont({"name": "Arial", "height": 30, "weight": 700})
        font_small = win32ui.CreateFont({"name": "Arial", "height": 24, "weight": 400})
        font_small_bold = win32ui.CreateFont({"name": "Arial", "height": 24, "weight": 700})
        
        hDC.StartDoc("Siparis Fisi")
        hDC.StartPage()
        
        def draw_centered(text, y, font):
            hDC.SelectObject(font)
            width, height = hDC.GetTextExtent(text)
            x = (horzres - width) // 2
            hDC.TextOut(x, y, text)
            return y + height + 5
            
        def draw_left(text, y, font):
            hDC.SelectObject(font)
            _, height = hDC.GetTextExtent(text)
            hDC.TextOut(10, y, text)
            return y + height + 5
            
        def draw_left_right(left_text, right_text, y, font):
            hDC.SelectObject(font)
            width_r, height = hDC.GetTextExtent(right_text)
            hDC.TextOut(10, y, left_text)
            hDC.TextOut(max(10, horzres - width_r - 10), y, right_text)
            return y + height + 5
            
        def draw_dashed(y):
            hDC.SelectObject(font_normal)
            width, height = hDC.GetTextExtent("-")
            count = horzres // width
            hDC.TextOut(0, y, "-" * count)
            return y + height + 5
            
        # Türkiye saat dilimi (UTC+3)
        TR_TZ = timezone(timedelta(hours=3))
        
        def format_date(iso_str):
            if not iso_str: return ""
            try:
                dt = datetime.fromisoformat(iso_str.replace('Z', '+00:00'))
                return dt.astimezone(TR_TZ).strftime("%d.%m.%Y")
            except: return iso_str
            
        def format_time(iso_str):
            if not iso_str: return ""
            try:
                dt = datetime.fromisoformat(iso_str.replace('Z', '+00:00'))
                return dt.astimezone(TR_TZ).strftime("%H:%M")
            except: return iso_str

        y = 0
        
        # Banner for Revised
        if order.is_revised:
            y = draw_centered(f"*** DÜZELTİLDİ (x{order.revision_count or 1}) ***", y, font_bold)
            y += 5

        # ★ FİRMA ADI — üst ortada büyük font
        company_display = _turkish_upper((order.company_name or "").strip())
        if company_display:
            y = draw_centered(company_display, y, font_company)
            y += 5
        y = draw_dashed(y)
            
        y = draw_centered("DOYURAN GÜVEÇ LOKANTASI", y, font_small_bold)
        y = draw_centered("Günlük Taze - Öğle Paketi", y, font_small)
        y += 5
        
        y = draw_left_right("Sipariş No:", f"#{order.order_no}", y, font_small_bold)
        y = draw_left_right("Tarih:", format_date(order.created_at), y, font_small)
        y = draw_left_right("Saat:", format_time(order.created_at), y, font_small)
        
        if order.is_revised and order.last_revised_at:
            y = draw_left_right("Düzeltildi:", format_time(order.last_revised_at), y, font_small_bold)

        # Manuel siparişlerde kişisel bilgileri gösterme
        is_manual = getattr(order, 'is_manual', False)
        if not is_manual:
            if order.contact_name: y = draw_left(order.contact_name, y, font_small)
            if order.phone: y = draw_left(f"Tel: {order.phone}", y, font_small)
            if order.address: 
                addr = order.address
                while len(addr) > 0:
                    y = draw_left(addr[:50], y, font_small)
                    addr = addr[50:]
                
        y = draw_dashed(y)
        
        # Kategorilere ayirma
        CAT_ORDER = ["Çorba", "Çorbalar", "Ana Yemek", "Yan Yemek", "Yan Lezzetler", "İçecek", "İçecekler", "Tatlı", "Tatlılar"]
        def cat_rank(c):
            for i, cat_name in enumerate(CAT_ORDER):
                if cat_name.lower() in c.lower():
                    return i
            return 999
            
        groups = {}
        for item in order.items:
            c = item.category or "Ana Yemek"
            if c not in groups: groups[c] = []
            groups[c].append(item)
            
        sorted_cats = sorted(groups.keys(), key=cat_rank)
        
        total_qty = 0
        for cat in sorted_cats:
            y = draw_left(cat.upper(), y, font_small_bold)
            y += 5
            for it in groups[cat]:
                name = it.name or ""
                qty = it.quantity or 1
                total_qty += qty
                y = draw_left_right(name[:40], f"x {qty}", y, font_normal)
            y += 10
            
        y = draw_dashed(y)
        
        ana_yemek_qty = 0
        if "Ana Yemek" in groups:
            ana_yemek_qty = sum(it.quantity or 1 for it in groups["Ana Yemek"])
            
        # Draw "TOPLAM: X" on the left, and "Y KİŞİLİK" in the center
        hDC.SelectObject(font_bold)
        left_text = f"TOPLAM: {total_qty}"
        hDC.TextOut(10, y + 4, left_text)
        
        center_text = f"{ana_yemek_qty} KİŞİLİK"
        hDC.SelectObject(font_large)
        width_c, height_c = hDC.GetTextExtent(center_text)
        x_center = (horzres - width_c) // 2
        hDC.TextOut(x_center, y, center_text)
        y += height_c + 5
        
        if order.note:
            y = draw_dashed(y)
            y = draw_left("NOT:", y, font_small_bold)
            note_str = order.note
            while len(note_str) > 0:
                y = draw_left(note_str[:45], y, font_small)
                note_str = note_str[45:]
                
        # Akşam yemeği isteği varsa yazdır
        dinner_text = getattr(order, 'meal_time', None) or ""
        if dinner_text.strip():
            y = draw_dashed(y)
            y = draw_centered("*** AKŞAM YEMEĞI ***", y, font_bold)
            y += 5
            import re
            for part in dinner_text.split(","):
                part = part.strip()
                if not part:
                    continue
                m = re.match(r'^(.+?)\s+x(\d+)$', part)
                if m:
                    y = draw_left_right(m.group(1).strip(), f"x {m.group(2)}", y, font_normal)
                else:
                    y = draw_left(part, y, font_normal)

        y = draw_dashed(y)
        y = draw_centered("doyuranguvec.com", y, font_small)
        
        y += 100
        hDC.TextOut(0, y, " ")
        
        hDC.EndPage()
        hDC.EndDoc()
        hDC.DeleteDC()
        return _monitor_spooler(printer_name)
        
    except Exception as e:
        print(f"YAZDIRMA HATASI (GDI): {e}")
        return False

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(threadName)s] %(message)s')
log = logging.getLogger("printer")

# ---------- Ayarlar ----------
POLL_INTERVAL = 3       # DB kontrol sıklığı (saniye)
PRINT_DELAY = 2         # Yazdırmalar arası bekleme (saniye) — yazıcı tıkanmasını önler
MAX_RETRY = 3           # Başarısız yazdırma tekrar deneme sayısı
RETRY_DELAY = 5         # Tekrar deneme arası bekleme (saniye)


def db_poller(Session, print_queue, stop_event):
    """DB'yi periyodik olarak kontrol eder, yeni siparişleri kuyruğa ekler."""
    seen_ids = set()
    while not stop_event.is_set():
        try:
            with Session() as session:
                new_orders = session.execute(
                    select(Order)
                    .where(Order.is_printed == False)
                    .order_by(Order.order_no)
                ).scalars().all()

                for order in new_orders:
                    if order.id not in seen_ids:
                        seen_ids.add(order.id)
                        # Detached snapshot — session kapandıktan sonra kullanılabilir
                        snapshot = {
                            "id": order.id,
                            "order_no": order.order_no,
                            "company_name": order.company_name,
                            "contact_name": order.contact_name,
                            "phone": order.phone,
                            "address": order.address,
                            "note": order.note,
                            "status": order.status,
                            "is_revised": order.is_revised,
                            "revision_count": order.revision_count,
                            "last_revised_at": order.last_revised_at,
                            "order_date": order.order_date,
                            "created_at": order.created_at,
                            "meal_time": order.meal_time or "",
                            "is_manual": getattr(order, 'is_manual', False) or False,
                            "items": [
                                {"name": i.name, "category": i.category, "quantity": i.quantity}
                                for i in order.items
                            ],
                        }
                        print_queue.put(snapshot)
                        log.info(f"Kuyruga eklendi: Siparis #{order.order_no} ({order.company_name})")

        except Exception as e:
            log.error(f"DB polling hatasi: {e}")

        stop_event.wait(POLL_INTERVAL)

    log.info("Poller durdu.")


class _OrderProxy:
    """print_receipt fonksiyonunun beklediği attribute erişimini sağlayan basit proxy."""
    def __init__(self, data):
        self.__dict__.update(data)
        self.items = [_ItemProxy(i) for i in data.get("items", [])]

class _ItemProxy:
    def __init__(self, data):
        self.__dict__.update(data)


def printer_worker(Session, print_queue, stop_event):
    """Kuyruktan sırayla sipariş alır, tek tek yazdırır."""
    while not stop_event.is_set():
        try:
            snapshot = print_queue.get(timeout=1)
        except queue.Empty:
            continue

        order_no = snapshot["order_no"]
        order_id = snapshot["id"]
        proxy = _OrderProxy(snapshot)

        log.info(f"Yazdiriliyor: Siparis #{order_no} (kuyrukta kalan: {print_queue.qsize()})")

        success = False
        while not success and not stop_event.is_set():
            success = print_receipt(proxy, PRINTER_NAME)
            if success:
                break
            log.warning(f"Siparis #{order_no} yazdirilamadi (Kagit bitmis/hata olabilir). 3 saniye sonra bastan denenecek...")
            time.sleep(3)

        if success:
            # DB'de is_printed = True olarak güncelle
            try:
                with Session() as session:
                    db_order = session.execute(
                        select(Order).where(Order.id == order_id)
                    ).scalars().first()
                    if db_order:
                        db_order.is_printed = True
                        session.commit()
                log.info(f"[OK] Siparis #{order_no} basariyla yazdirildi.")
            except Exception as e:
                log.error(f"DB guncelleme hatasi (siparis #{order_no}): {e}")

        print_queue.task_done()

        # Yazıcıya nefes aldır
        if not print_queue.empty():
            time.sleep(PRINT_DELAY)

    log.info("Printer worker durdu.")


def main():
    print("=" * 50)
    print("  Doyuran Guvec — Yazici Kuyruk Servisi")
    print(f"  Yazici: {PRINTER_NAME}")
    print(f"  Kuyruk arasi bekleme: {PRINT_DELAY}s")
    print(f"  Hata tekrar deneme: {MAX_RETRY}x")
    print("  Kapatmak icin CTRL+C")
    print("=" * 50)

    engine = create_engine(DATABASE_URL)

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        if DATABASE_URL.startswith("sqlite"):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    Session = sessionmaker(bind=engine)
    print_queue = queue.Queue()
    stop_event = threading.Event()

    poller = threading.Thread(target=db_poller, args=(Session, print_queue, stop_event), name="Poller", daemon=True)
    worker = threading.Thread(target=printer_worker, args=(Session, print_queue, stop_event), name="Printer", daemon=True)

    poller.start()
    worker.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        log.info("Kapatiliyor...")
        stop_event.set()
        poller.join(timeout=5)
        worker.join(timeout=10)
        log.info("Servis durduruldu.")


if __name__ == '__main__':
    main()
