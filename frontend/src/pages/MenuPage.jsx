import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail, sortByCategory, groupByCategory } from "../lib/api";
import { useCart } from "../lib/cart";
import { useAuth } from "../lib/auth";
import NavBar from "../components/NavBar";
import { Button } from "../components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { Textarea } from "../components/ui/textarea";
import { Plus, Minus, ShoppingBag, Utensils, Trash2, Moon } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "../lib/language";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState(() => {
    return typeof Notification !== "undefined" ? Notification.permission : "default";
  });

  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  useEffect(() => {
    api.get("/menu/today")
      .then((r) => setItems(r.data))
      .catch(() => toast.error(t("menu_err_load")))
      .finally(() => setLoading(false));
  }, [t]);

  // Request notification permissions
  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") return;
    const res = await Notification.requestPermission();
    setNotifPermission(res);
  };

  // Background check for daily menu publishing
  useEffect(() => {
    if (typeof Notification === "undefined" || notifPermission !== "granted") return;

    const checkMenu = async () => {
      try {
        const r = await api.get("/menu/today");
        if (r.data && r.data.length > 0) {
          const today = new Date().toDateString();
          const lastNotified = localStorage.getItem("notified-menu-date");
          if (lastNotified !== today) {
            new Notification(t("notification_title"), {
              body: t("notification_body"),
              icon: "/favicon.ico",
            });
            localStorage.setItem("notified-menu-date", today);
          }
        }
      } catch (err) {
        console.error("Menu notification check error", err);
      }
    };

    const interval = setInterval(checkMenu, 60000);
    checkMenu(); // Run immediately on mount

    return () => clearInterval(interval);
  }, [notifPermission, t]);

  const triggerPlaceOrder = () => {
    if (!cart.items.length) return;
    setConfirmOpen(true);
  };

  const submitOrder = async () => {
    setConfirmOpen(false);
    setPlacing(true);
    try {
      const res = await api.post("/orders", {
        items: cart.items.map((i) => ({ menu_item_id: i.id, quantity: i.quantity })),
        note,
        meal_time: cart.dinnerSummary || "",
      });
      cart.clear();
      setNote("");
      setCartOpen(false);
      toast.success(t("cart_order_success", { no: res.data.order_no }));
      navigate("/orders");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setPlacing(false);
    }
  };

  const formattedDate = new Date().toLocaleDateString(
    language === "tr" ? "tr-TR" : language === "az" ? "az-AZ" : "ar-SY",
    { weekday: "long", day: "2-digit", month: "long" }
  );

  return (
    <div className="min-h-screen bg-[#F9F6F0]">
      <NavBar onCartClick={() => setCartOpen(true)} />

      <section className="max-w-7xl mx-auto px-5 md:px-8 pt-10 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="w-full">
            <div className="text-xs uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-2">
              {formattedDate}
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-[#2C2A29]">{t("menu_today")}</h1>
            <p className="text-[#5C5855] mt-2 max-w-xl">
              {user?.company_name && <>{t("menu_welcome", { firm: user.company_name })} </>}
              {t("menu_desc")}
            </p>

            {/* Notification Permission Prompt Banner */}
            {notifPermission === "default" && (
              <div className="bg-[#C05A46]/10 border border-[#C05A46]/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 mt-6">
                <div className="text-sm text-[#2C2A29] font-medium">{t("notification_prompt")}</div>
                <Button onClick={requestNotifPermission} className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full text-xs h-9 px-4">
                  {t("notification_enable_btn")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 md:px-8 pb-24">
        {loading ? (
          <div className="text-center py-20 text-[#8A8580]">{t("menu_loading")}</div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl bg-white border border-[#E5DFD3] p-12 text-center">
            <Utensils className="mx-auto text-[#C05A46]" size={36} />
            <div className="font-heading text-2xl font-bold mt-4">{t("menu_no_menu_title")}</div>
            <p className="text-[#5C5855] mt-2">{t("menu_no_menu_desc")}</p>
          </div>
        ) : (
          <CategorizedMenu items={items} />
        )}
      </section>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full sm:max-w-md bg-[#F9F6F0] border-l border-[#E5DFD3] flex flex-col p-0" data-testid="cart-sheet">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-[#E5DFD3]">
            <SheetTitle className="font-heading text-2xl">{t("cart_title")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {cart.items.length === 0 ? (
              <div className="text-center text-[#8A8580] py-16">
                <ShoppingBag className="mx-auto mb-3" size={32} />
                {t("cart_empty")}
              </div>
            ) : (
              <CartList />
            )}

            {/* Akşam Yemeği Seçeneği */}
            {cart.items.length > 0 && (
              <div className="mt-5">
                <button
                  onClick={() => cart.setDinner(!cart.dinnerEnabled)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    cart.dinnerEnabled
                      ? "border-[#C05A46] bg-[#C05A46]/10"
                      : "border-[#E5DFD3] bg-white hover:border-[#C05A46]/40"
                  }`}
                  data-testid="dinner-toggle"
                >
                  <Moon size={18} className={cart.dinnerEnabled ? "text-[#C05A46]" : "text-[#8A8580]"} />
                  <div className="flex-1 text-left rtl:text-right">
                    <div className={`text-sm font-semibold ${cart.dinnerEnabled ? "text-[#C05A46]" : "text-[#2C2A29]"}`}>
                      {t("cart_dinner_label")}
                    </div>
                    <div className="text-[10px] text-[#8A8580]">{t("cart_dinner_desc")}</div>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${
                    cart.dinnerEnabled ? "bg-[#C05A46]" : "bg-[#E5DFD3]"
                  }`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                      cart.dinnerEnabled ? (language === "ar" ? "right-5" : "left-5") : (language === "ar" ? "right-1" : "left-1")
                    }`} />
                  </div>
                </button>

                {cart.dinnerEnabled && (
                  <div className="mt-3 bg-white rounded-xl border border-[#E5DFD3] overflow-hidden">
                    <div className="px-3 py-2 bg-[#2C2A29]">
                      <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white flex items-center gap-1.5">
                        <Moon size={12} /> {t("cart_dinner_title")}
                      </div>
                    </div>

                    {/* Seçilen akşam ürünleri */}
                    {cart.dinnerItems.length > 0 && (
                      <div className="px-3 py-2 border-b border-[#E5DFD3] bg-[#C05A46]/5">
                        <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#C05A46] mb-1.5">{t("cart_dinner_selected")}</div>
                        {cart.dinnerItems.map((di) => (
                          <div key={di.id} className="flex items-center gap-2 py-1.5">
                            <span className="flex-1 text-sm font-medium text-[#2C2A29] truncate">{di.name}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => cart.updateDinnerQty(di.id, di.quantity - 1)} className="w-6 h-6 rounded-full bg-white border border-[#E5DFD3] grid place-items-center hover:bg-[#F2EBE3]"><Minus size={10} /></button>
                              <span className="w-6 text-center text-xs font-bold">{di.quantity}</span>
                              <button onClick={() => cart.updateDinnerQty(di.id, di.quantity + 1)} className="w-6 h-6 rounded-full bg-white border border-[#E5DFD3] grid place-items-center hover:bg-[#F2EBE3]"><Plus size={10} /></button>
                            </div>
                            <button onClick={() => cart.removeDinnerItem(di.id)} className="text-[#8A8580] hover:text-[#B93A32]"><Trash2 size={12} /></button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Menüden ekle */}
                    <div className="px-3 py-2 max-h-48 overflow-y-auto">
                      <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#8A8580] mb-1.5">{t("cart_dinner_add_more")}</div>
                      {items
                        .filter((m) => !cart.dinnerItems.some((di) => di.id === m.id))
                        .map((m) => (
                          <button
                            key={m.id}
                            onClick={() => cart.addDinnerItem(m)}
                            className="w-full flex items-center gap-2 py-1.5 text-left rtl:text-right hover:bg-[#F2EBE3] rounded px-1 transition-colors"
                          >
                            <Plus size={12} className="text-[#C05A46] shrink-0" />
                            <span className="flex-1 text-sm text-[#2C2A29] truncate">{m.name}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {cart.items.length > 0 && (
              <div className="mt-5">
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">{t("cart_note_label")}</label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("cart_note_placeholder")} className="mt-2 rounded-lg border-[#E5DFD3] bg-white" data-testid="cart-note-input" />
                
                {/* Predefined Note presets */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4].map((num) => {
                    const text = t(`note_preset_${num}`);
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setNote((prev) => (prev ? `${prev}, ${text}` : text))}
                        className="text-[10px] bg-white hover:bg-[#F2EBE3] text-[#5C5855] border border-[#E5DFD3] rounded-full px-2.5 py-1 transition-all"
                      >
                        {text}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[#E5DFD3] px-6 py-5 bg-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm uppercase tracking-[0.2em] font-bold text-[#8A8580]">{t("cart_total_qty")}</span>
              <span className="font-heading text-2xl font-bold" data-testid="cart-total-count">{cart.count}</span>
            </div>
            <Button
              onClick={triggerPlaceOrder}
              disabled={cart.items.length === 0 || placing}
              className="w-full h-12 bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full font-semibold"
              data-testid="cart-place-order-button"
            >
              {placing ? t("cart_order_submitting") : t("cart_order_submit")}
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
          <ShoppingBag size={18} /> {t("cart_mobile_count", { count: cart.count })}
        </button>
      )}

      {/* Place Order Confirmation AlertDialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-white rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-xl">{t("confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription className="text-[#5C5855] text-sm">
              {t("confirm_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border-[#E5DFD3]" onClick={() => setConfirmOpen(false)}>
              {t("confirm_cancel")}
            </AlertDialogCancel>
            <AlertDialogAction className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full" onClick={submitOrder}>
              {t("confirm_action")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CartList() {
  const cart = useCart();
  const groups = groupByCategory(cart.items);
  const { t } = useLanguage();

  const getCategoryTranslation = (cat) => {
    if (cat.toLowerCase().includes("çorba")) return t("cat_soup");
    if (cat.toLowerCase().includes("ana yemek")) return t("cat_main");
    if (cat.toLowerCase().includes("yan yemek") || cat.toLowerCase().includes("yan lezzet")) return t("cat_side");
    if (cat.toLowerCase().includes("i̇çecek") || cat.toLowerCase().includes("icecek")) return t("cat_drink");
    if (cat.toLowerCase().includes("tatlı") || cat.toLowerCase().includes("tatli")) return t("cat_dessert");
    return cat;
  };

  return (
    <div className="space-y-5">
      {groups.map(({ cat, items }) => (
        <div key={cat}>
          <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-2">{getCategoryTranslation(cat)}</div>
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 bg-white rounded-xl border border-[#E5DFD3] p-3" data-testid={`cart-item-${i.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#2C2A29] truncate">{i.name}</div>
                  <div className="text-xs text-[#8A8580]">{t("orders_items_count", { items: 1, qty: i.quantity }).split("·")[1]?.trim() || `Adet: ${i.quantity}`}</div>
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
  const groups = groupByCategory(sorted);
  const { t } = useLanguage();

  const getCategoryTranslation = (cat) => {
    if (cat.toLowerCase().includes("çorba")) return t("cat_soup");
    if (cat.toLowerCase().includes("ana yemek")) return t("cat_main");
    if (cat.toLowerCase().includes("yan yemek") || cat.toLowerCase().includes("yan lezzet")) return t("cat_side");
    if (cat.toLowerCase().includes("i̇çecek") || cat.toLowerCase().includes("icecek")) return t("cat_drink");
    if (cat.toLowerCase().includes("tatlı") || cat.toLowerCase().includes("tatli")) return t("cat_dessert");
    return cat;
  };

  let idx = 0;
  return (
    <div className="space-y-12">
      {groups.map(({ cat, items: catItems }) => (
        <div key={cat}>
          <div className="flex items-end gap-3 mb-5">
            <h2 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-[#2C2A29]">{getCategoryTranslation(cat)}</h2>
            <div className="flex-1 border-b border-dashed border-[#E5DFD3] pb-2"></div>
            <span className="text-xs text-[#8A8580] font-mono">{t("menu_count_types", { count: catItems.length })}</span>
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
  const { t } = useLanguage();

  const getCategoryTranslation = (cat) => {
    if (cat.toLowerCase().includes("çorba")) return t("cat_soup");
    if (cat.toLowerCase().includes("ana yemek")) return t("cat_main");
    if (cat.toLowerCase().includes("yan yemek") || cat.toLowerCase().includes("yan lezzet")) return t("cat_side");
    if (cat.toLowerCase().includes("i̇çecek") || cat.toLowerCase().includes("icecek")) return t("cat_drink");
    if (cat.toLowerCase().includes("tatlı") || cat.toLowerCase().includes("tatli")) return t("cat_dessert");
    return cat;
  };

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden border border-[#E5DFD3] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col fade-up p-6"
      style={{ animationDelay: `${idx * 60}ms` }}
      data-testid={`menu-card-${item.id}`}
    >
      {item.category && (
        <span className="self-start bg-[#F2EBE3] text-[#C05A46] text-[10px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 rounded-full mb-3">
          {getCategoryTranslation(item.category)}
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
          onClick={() => { cart.addItem(item, qty); toast.success(t("menu_added_to_cart", { name: item.name })); setQty(1); }}
          className="bg-[#2C2A29] hover:bg-[#1a1918] text-white rounded-full px-5 h-9"
          data-testid={`menu-add-${item.id}`}
        >
          {t("menu_add_btn")}
        </Button>
      </div>
    </div>
  );
}
