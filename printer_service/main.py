import os
import time
from sqlalchemy import create_engine, select, Column, String, Boolean, Integer, Float, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from dotenv import load_dotenv

try:
    import win32print
except ImportError:
    print("UYARI: pywin32 modulu yuklu degil. Yazdirma yapilamaz.")
    win32print = None

load_dotenv("../backend/.env")

# Eger sqlite ise psycopg2 ile alakasi olmaz, ama SQLAlchemy her ikisini de baglar.
# Async engine (aiosqlite) main programda kullaniliyor, burada synchronous engine kullanmak daha kolay:
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///../backend/doyuran_guvec.db')
if DATABASE_URL.startswith("sqlite+aiosqlite"):
    DATABASE_URL = DATABASE_URL.replace("sqlite+aiosqlite", "sqlite")
    
if DATABASE_URL == "sqlite:///./doyuran_guvec.db":
    # Env dosyasindan relative path geldigi icin backend klasorune isaret etmesi lazim
    DATABASE_URL = "sqlite:///../backend/doyuran_guvec.db"
elif DATABASE_URL.startswith("postgresql+asyncpg"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg", "postgresql")

PRINTER_NAME = "XP-80C"

Base = declarative_base()

class Order(Base):
    __tablename__ = 'orders'
    id = Column(String, primary_key=True)
    order_no = Column(Integer)
    company_name = Column(String)
    contact_name = Column(String)
    phone = Column(String)
    note = Column(String)
    status = Column(String)
    is_printed = Column(Boolean)
    
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = 'order_items'
    id = Column(String, primary_key=True)
    order_id = Column(String, ForeignKey('orders.id'))
    name = Column(String)
    quantity = Column(Integer)
    
    order = relationship("Order", back_populates="items")


def print_receipt(order, printer_name):
    text = "\n"
    text += "       DOYURAN GUVEC LOKANTASI\n"
    text += "       Gunluk Taze - Ogle Paketi\n"
    text += "-" * 32 + "\n"
    text += f"Siparis No: #{order.order_no}\n"
    text += f"Firma: {order.company_name or ''}\n"
    if order.contact_name:
        text += f"Yetkili: {order.contact_name}\n"
    if order.phone:
        text += f"Tel: {order.phone}\n"
    text += "-" * 32 + "\n"
    
    total_qty = 0
    for item in order.items:
        name = item.name or ""
        qty = item.quantity or 1
        total_qty += qty
        line = f"{name[:25]:<25} x{qty:>2}\n"
        text += line
        
    text += "-" * 32 + "\n"
    text += f"TOPLAM ADET: {total_qty}\n"
    
    if order.note:
        text += "-" * 32 + "\n"
        text += f"NOT: {order.note}\n"
        
    text += "-" * 32 + "\n"
    text += "         Afiyet Olsun!\n"
    text += "       doyuranguvec.com\n"
    text += "\n\n\n\n"
    
    tr_map = str.maketrans("ğüşöçıİĞÜŞÖÇ", "gusociIGUSOC")
    text = text.translate(tr_map)
    raw_data = bytes(text, "ascii", errors="ignore")
    
    if not win32print:
        print("SIMULASYON: Yazici modulu yok. Fis yazdirilmis sayildi.")
        print(text)
        return True

    try:
        hPrinter = win32print.OpenPrinter(printer_name)
        try:
            hJob = win32print.StartDocPrinter(hPrinter, 1, ("Siparis Fisi", None, "RAW"))
            try:
                win32print.StartPagePrinter(hPrinter)
                win32print.WritePrinter(hPrinter, raw_data)
                
                cut_cmd = b'\x1D\x56\x00'
                win32print.WritePrinter(hPrinter, cut_cmd)
                
                win32print.EndPagePrinter(hPrinter)
            finally:
                win32print.EndDocPrinter(hPrinter)
        finally:
            win32print.ClosePrinter(hPrinter)
        return True
    except Exception as e:
        print(f"YAZDIRMA HATASI: Lutfen yazicinin acik ve {printer_name} adiyla bagli oldugundan emin olun. Detay: {e}")
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
                        print(f"[✓] Siparis #{order.order_no} basariyla yazdirildi.")
                        print("-" * 40)
                        
        except Exception as e:
            print(f"Veritabani kontrol hatasi: {e}")
            
        time.sleep(3)

if __name__ == '__main__':
    main()
