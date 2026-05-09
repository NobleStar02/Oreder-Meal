import os
import time
from pathlib import Path
from sqlalchemy import create_engine, select, Column, String, Boolean, Integer, Float, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from dotenv import load_dotenv

try:
    import win32print
except ImportError:
    print("UYARI: pywin32 modulu yuklu degil. Yazdirma yapilamaz.")
    win32print = None

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / "backend" / ".env")

# Eger sqlite ise psycopg2 ile alakasi olmaz, ama SQLAlchemy her ikisini de baglar.
# Async engine (aiosqlite) main programda kullaniliyor, burada synchronous engine kullanmak daha kolay:
DATABASE_URL = os.environ.get('DATABASE_URL', f'sqlite:///{ROOT_DIR}/backend/doyuran_guvec.db')
if DATABASE_URL.startswith("sqlite+aiosqlite"):
    DATABASE_URL = DATABASE_URL.replace("sqlite+aiosqlite", "sqlite")
    
if DATABASE_URL == "sqlite:///./doyuran_guvec.db":
    # Env dosyasindan relative path geldigi icin backend klasorune isaret etmesi lazim
    DATABASE_URL = f"sqlite:///{ROOT_DIR}/backend/doyuran_guvec.db"
elif DATABASE_URL.startswith("postgresql+asyncpg"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg", "postgresql")


PRINTER_NAME = "POSPrinter POS80"

Base = declarative_base()

class Order(Base):
    __tablename__ = 'orders'
    id = Column(String, primary_key=True)
    order_no = Column(Integer)
    company_name = Column(String)
    contact_name = Column(String)
    phone = Column(String)
    address = Column(String)
    note = Column(String)
    status = Column(String)
    is_printed = Column(Boolean)
    is_revised = Column(Boolean)
    revision_count = Column(Integer)
    created_at = Column(String)
    last_revised_at = Column(String)
    
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = 'order_items'
    id = Column(String, primary_key=True)
    order_id = Column(String, ForeignKey('orders.id'))
    name = Column(String)
    quantity = Column(Integer)
    category = Column(String)
    
    order = relationship("Order", back_populates="items")


def print_receipt(order, printer_name):
    if not win32print:
        print("SIMULASYON: win32print kurulu degil.")
        return True

    try:
        import win32ui
        import win32con
        from datetime import datetime
        
        hDC = win32ui.CreateDC()
        hDC.CreatePrinterDC(printer_name)
        
        horzres = hDC.GetDeviceCaps(win32con.HORZRES)
        
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
            
        def format_date(iso_str):
            if not iso_str: return ""
            try: return datetime.fromisoformat(iso_str.replace('Z', '+00:00')).strftime("%d.%m.%Y")
            except: return iso_str
            
        def format_time(iso_str):
            if not iso_str: return ""
            try: return datetime.fromisoformat(iso_str.replace('Z', '+00:00')).strftime("%H:%M")
            except: return iso_str

        y = 0
        
        # Banner for Revised
        if order.is_revised:
            y = draw_centered(f"*** DÜZELTİLDİ (x{order.revision_count or 1}) ***", y, font_bold)
            y += 5
            
        y = draw_centered("DOYURAN GÜVEÇ LOKANTASI", y, font_bold)
        y = draw_centered("Günlük Taze - Öğle Paketi", y, font_small)
        y += 10
        y = draw_dashed(y)
        
        y = draw_left_right("Sipariş No:", f"#{order.order_no}", y, font_small_bold)
        y = draw_left_right("Tarih:", format_date(order.created_at), y, font_small)
        y = draw_left_right("Saat:", format_time(order.created_at), y, font_small)
        
        if order.is_revised and order.last_revised_at:
            y = draw_left_right("Düzeltildi:", format_time(order.last_revised_at), y, font_small_bold)
            
        y = draw_dashed(y)
        
        y = draw_left(order.company_name or "", y, font_bold)
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
                
        y = draw_dashed(y)
        y = draw_centered("Afiyet olsun!", y, font_small)
        y = draw_centered("doyuranguvec.com", y, font_small)
        
        y += 100
        hDC.TextOut(0, y, " ")
        
        hDC.EndPage()
        hDC.EndDoc()
        hDC.DeleteDC()
        return True
        
    except Exception as e:
        print(f"YAZDIRMA HATASI (GDI): {e}")
        return False

def main():
    print("------------------------------------------")
    print("Doyuran Guvec - Otomatik Yazici Servisi (SQL)")
    print("Siparisler bekleniyor... (Kapatmak icin CTRL+C)")
    print("------------------------------------------")
    
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    
    while True:
        try:
            with Session() as session:
                new_orders = session.execute(
                    select(Order).where(Order.status == "yeni", Order.is_printed == False).order_by(Order.order_no)
                ).scalars().all()
                
                for order in new_orders:
                    print(f"[!] Yeni siparis geldi! No: #{order.order_no}")
                    
                    success = print_receipt(order, PRINTER_NAME)
                    
                    if success:
                        order.is_printed = True
                        session.commit()
                        print(f"[OK] Siparis #{order.order_no} basariyla yazdirildi.")
                        print("-" * 40)
                        
        except Exception as e:
            print(f"Veritabani kontrol hatasi: {e}")
            
        time.sleep(3)

if __name__ == '__main__':
    main()
