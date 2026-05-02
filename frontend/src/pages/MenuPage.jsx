import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fileUrl, formatApiErrorDetail, sortByCategory, CATEGORY_ORDER, categoryRank } from "../lib/api";
import { useCart } from "../lib/cart";
import { useAuth } from "../lib/auth";
import NavBar from "../components/NavBar";
import { Button } from "../components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { Textarea } from "../components/ui/textarea";
import { Plus, Minus, ShoppingBag, Utensils, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/menu/today")
      .then((r) => setItems(r.data))
      .catch(() => toast.error("Menü yüklenemedi"))
      .finally(() => setLoading(false));
  }, []);

  const placeOrder = async () => {
    if (!cart.items.length) return;
    setPlacing(true);
    try {
      const res = await api.post("/orders", {
        items: cart.items.map((i) => ({ menu_item_id: i.id, quantity: i.quantity })),
        note,
      });
      cart.clear();
      setNote("");
      setCartOpen(false);
      toast.success(`Siparişiniz alındı! Sipariş no: #${res.data.order_no}`);
      navigate("/orders");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0]">
      <NavBar onCartClick={() => setCartOpen(true)} />

      <section className="max-w-7xl mx-auto px-5 md:px-8 pt-10 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-2">
              {new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "2-digit", month: "long" })}
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-[#2C2A29]">Bugünün Menüsü</h1>
            <p className="text-[#5C5855] mt-2 max-w-xl">
              {user?.company_name && <>Hoş geldiniz, <span className="font-semibold text-[#2C2A29]">{user.company_name}</span>. </>}
              Yemekleri seçin, adetleri belirleyin, siparişinizi tek tıkla mutfağa iletin.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 md:px-8 pb-24">
        {loading ? (
          <div className="text-center py-20 text-[#8A8580]">Menü yükleniyor…</div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl bg-white border border-[#E5DFD3] p-12 text-center">
            <Utensils className="mx-auto text-[#C05A46]" size={36} />
            <div className="font-heading text-2xl font-bold mt-4">Bugün için menü henüz yayınlanmadı</div>
            <p className="text-[#5C5855] mt-2">Lokanta sahibimiz menüyü yayınladığında burada görünecek.</p>
          </div>
        ) : (
          <CategorizedMenu items={items} />
        )}
      </section>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full sm:max-w-md bg-[#F9F6F0] border-l border-[#E5DFD3] flex flex-col p-0" data-testid="cart-sheet">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-[#E5DFD3]">
            <SheetTitle className="font-heading text-2xl">Sepet</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {cart.items.length === 0 ? (
              <div className="text-center text-[#8A8580] py-16">
                <ShoppingBag className="mx-auto mb-3" size={32} />
                Sepetiniz boş
              </div>
            ) : (
              <CartList />
            )}

            {cart.items.length > 0 && (
              <div className="mt-5">
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">Sipariş Notu</label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Az tuzlu, çok ekmek vs." className="mt-2 rounded-lg border-[#E5DFD3] bg-white" data-testid="cart-note-input" />
              </div>
            )}
          </div>

          <div className="border-t border-[#E5DFD3] px-6 py-5 bg-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm uppercase tracking-[0.2em] font-bold text-[#8A8580]">Toplam Adet</span>
              <span className="font-heading text-2xl font-bold" data-testid="cart-total-count">{cart.count}</span>
            </div>
            <Button
              onClick={placeOrder}
              disabled={cart.items.length === 0 || placing}
              className="w-full h-12 bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full font-semibold"
              data-testid="cart-place-order-button"
            >
              {placing ? "Gönderiliyor…" : "Siparişi Gönder"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Floating cart button (mobile) */}
      {cart.count > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="sm:hidden fixed bottom-5 right-5 bg-[#C05A46] text-white rounded-full px-5 py-3 shadow-lg flex items-center gap-2 z-50"
          data-testid="floating-cart-button"
        >
          <ShoppingBag size={18} /> {cart.count} ürün
        </button>
      )}
    </div>
  );
}

function CartList() {
  const cart = useCart();
  const groups = CATEGORY_ORDER
    .map((cat) => ({ cat, items: cart.items.filter((i) => (i.category || "Ana Yemek") === cat) }))
    .filter((g) => g.items.length > 0);
  const others = cart.items.filter((i) => categoryRank(i.category || "Ana Yemek") === 999);
  if (others.length) groups.push({ cat: "Diğer", items: others });

  return (
    <div className="space-y-5">
      {groups.map(({ cat, items }) => (
        <div key={cat}>
          <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-2">{cat}</div>
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 bg-white rounded-xl border border-[#E5DFD3] p-3" data-testid={`cart-item-${i.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#2C2A29] truncate">{i.name}</div>
                  <div className="text-xs text-[#8A8580]">Adet: {i.quantity}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => cart.updateQty(i.id, i.quantity - 1)} className="w-8 h-8 rounded-full bg-[#F2EBE3] hover:bg-[#E5DFD3] grid place-items-center" data-testid={`cart-decrease-${i.id}`}><Minus size={14} /></button>
                  <span className="w-8 text-center font-semibold">{i.quantity}</span>
                  <button onClick={() => cart.updateQty(i.id, i.quantity + 1)} className="w-8 h-8 rounded-full bg-[#F2EBE3] hover:bg-[#E5DFD3] grid place-items-center" data-testid={`cart-increase-${i.id}`}><Plus size={14} /></button>
                </div>
                <button onClick={() => cart.removeItem(i.id)} className="text-[#8A8580] hover:text-[#B93A32]" data-testid={`cart-remove-${i.id}`}><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function CategorizedMenu({ items }) {
  const sorted = sortByCategory(items);
  const groups = CATEGORY_ORDER
    .map((cat) => ({ cat, items: sorted.filter((i) => (i.category || "Ana Yemek") === cat) }))
    .filter((g) => g.items.length > 0);
  const others = sorted.filter((i) => categoryRank(i.category || "Ana Yemek") === 999);
  if (others.length) groups.push({ cat: "Diğer", items: others });

  let idx = 0;
  return (
    <div className="space-y-12">
      {groups.map(({ cat, items: catItems }) => (
        <div key={cat}>
          <div className="flex items-end gap-3 mb-5">
            <h2 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-[#2C2A29]">{cat}</h2>
            <div className="flex-1 border-b border-dashed border-[#E5DFD3] pb-2"></div>
            <span className="text-xs text-[#8A8580] font-mono">{catItems.length} çeşit</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {catItems.map((it) => <MenuCard key={it.id} item={it} idx={idx++} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function MenuCard({ item, idx }) {
  const cart = useCart();
  const [qty, setQty] = useState(1);
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden border border-[#E5DFD3] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col fade-up p-6"
      style={{ animationDelay: `${idx * 60}ms` }}
      data-testid={`menu-card-${item.id}`}
    >
      {item.category && (
        <span className="self-start bg-[#F2EBE3] text-[#C05A46] text-[10px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 rounded-full mb-3">
          {item.category}
        </span>
      )}
      <div className="font-heading text-xl md:text-2xl font-bold text-[#2C2A29] tracking-tight">{item.name}</div>
      {item.description && (
        <p className="text-sm text-[#5C5855] mt-1.5 leading-relaxed">{item.description}</p>
      )}
      <div className="mt-5 pt-5 border-t border-dashed border-[#E5DFD3] flex items-center justify-end gap-2">
        <div className="flex items-center bg-[#F2EBE3] rounded-full">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 rounded-full grid place-items-center hover:bg-[#E5DFD3]" data-testid={`menu-qty-decrease-${item.id}`}><Minus size={14} /></button>
          <span className="w-7 text-center text-sm font-semibold" data-testid={`menu-qty-${item.id}`}>{qty}</span>
          <button onClick={() => setQty(qty + 1)} className="w-8 h-8 rounded-full grid place-items-center hover:bg-[#E5DFD3]" data-testid={`menu-qty-increase-${item.id}`}><Plus size={14} /></button>
        </div>
        <Button
          onClick={() => { cart.addItem(item, qty); toast.success(`${item.name} sepete eklendi`); setQty(1); }}
          className="bg-[#2C2A29] hover:bg-[#1a1918] text-white rounded-full px-5 h-9"
          data-testid={`menu-add-${item.id}`}
        >
          Ekle
        </Button>
      </div>
    </div>
  );
}
