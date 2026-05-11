import { useEffect, useState, useCallback } from "react";
import { api, formatApiErrorDetail, groupByCategory, todayISO, formatTimeTR } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Plus, Minus, Trash2, Send, Building2, Utensils, CheckCircle2, Loader2, History, BarChart3, Printer, X, Clock, Moon } from "lucide-react";
import { toast } from "sonner";

/* ───────── TAB SWITCH ───────── */
const TABS = [
  { key: "new", label: "Yeni Sipariş", icon: <Send size={14} /> },
  { key: "history", label: "Geçmiş", icon: <History size={14} /> },
];

export default function AdminManualOrder() {
  const [tab, setTab] = useState("new");

  return (
    <div>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-2">Manuel Sipariş</div>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-[#2C2A29]">Hızlı Sipariş Girişi</h1>
        <p className="text-[#5C5855] mt-1">Telefon veya yüz yüze alınan siparişleri buradan girebilirsiniz.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[#F2EBE3] rounded-full p-1 mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === t.key ? "bg-white text-[#2C2A29] shadow-sm" : "text-[#8A8580] hover:text-[#2C2A29]"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "new" && <NewOrderTab />}
      {tab === "history" && <HistoryTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB 1 — YENİ SİPARİŞ
   ═══════════════════════════════════════════════ */
function NewOrderTab() {
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [cart, setCart] = useState([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  // Akşam yemeği state
  const [dinnerEnabled, setDinnerEnabled] = useState(false);
  const [dinnerItems, setDinnerItems] = useState([]); // [{id, name, quantity}]

  const loadMenu = useCallback(() => {
    setMenuLoading(true);
    api.get(`/admin/menu?date=${todayISO()}`)
      .then((r) => setMenuItems(r.data.filter((i) => i.available)))
      .catch(() => toast.error("Menü yüklenemedi"))
      .finally(() => setMenuLoading(false));
  }, []);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  const addToCart = (item) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.id === item.id);
      if (ex) return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: item.id, name: item.name, category: item.category, quantity: 1 }];
    });
  };
  const updateQty = (id, qty) => {
    if (qty < 1) { setCart((p) => p.filter((c) => c.id !== id)); return; }
    setCart((p) => p.map((c) => c.id === id ? { ...c, quantity: qty } : c));
  };
  const removeFromCart = (id) => setCart((p) => p.filter((c) => c.id !== id));
  const totalQty = cart.reduce((s, c) => s + c.quantity, 0);

  // Akşam yemeği fonksiyonları
  const addDinnerItem = (item) => {
    setDinnerItems((prev) => {
      const ex = prev.find((d) => d.id === item.id);
      if (ex) return prev.map((d) => d.id === item.id ? { ...d, quantity: d.quantity + 1 } : d);
      return [...prev, { id: item.id, name: item.name, quantity: 1 }];
    });
  };
  const updateDinnerQty = (id, qty) => {
    if (qty < 1) { setDinnerItems((p) => p.filter((d) => d.id !== id)); return; }
    setDinnerItems((p) => p.map((d) => d.id === id ? { ...d, quantity: qty } : d));
  };
  const removeDinnerItem = (id) => setDinnerItems((p) => p.filter((d) => d.id !== id));
  const dinnerSummary = dinnerEnabled && dinnerItems.length > 0
    ? dinnerItems.map((d) => `${d.name} x${d.quantity}`).join(", ")
    : "";

  const submitOrder = async () => {
    if (!companyName.trim()) { toast.error("Firma adı zorunludur"); return; }
    if (cart.length === 0) { toast.error("En az bir ürün ekleyin"); return; }
    setSubmitting(true);
    try {
      const res = await api.post("/admin/manual-order", {
        company_name: companyName.trim(),
        items: cart.map((c) => ({ menu_item_id: c.id, quantity: c.quantity })),
        note: note.trim(),
        meal_time: dinnerSummary,
      });
      setLastOrder(res.data);
      toast.success(`Manuel sipariş #${res.data.order_no} oluşturuldu!`);
      setCompanyName(""); setCart([]); setNote("");
      setDinnerEnabled(false); setDinnerItems([]);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setSubmitting(false); }
  };

  const menuGroups = groupByCategory(menuItems);

  return (
    <>
      {lastOrder && (
        <div className="mb-6 bg-[#4A5D23]/10 border border-[#4A5D23]/30 rounded-2xl p-5 flex items-start gap-3 fade-up">
          <CheckCircle2 className="text-[#4A5D23] shrink-0 mt-0.5" size={20} />
          <div>
            <div className="font-heading text-lg font-bold text-[#2C2A29]">
              Sipariş #{lastOrder.order_no} — {lastOrder.company_name}
            </div>
            <div className="text-sm text-[#5C5855] mt-0.5">
              {lastOrder.items.length} çeşit · {lastOrder.items.reduce((s, i) => s + i.quantity, 0)} adet — Yazıcıya otomatik gönderilecek
            </div>
            <button onClick={() => setLastOrder(null)} className="text-xs text-[#8A8580] hover:text-[#C05A46] mt-1 underline">Kapat</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
        {/* Menü listesi */}
        <div className="bg-white rounded-2xl border border-[#E5DFD3] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5DFD3] bg-[#F9F6F0]">
            <div className="flex items-center gap-2">
              <Utensils size={16} className="text-[#C05A46]" />
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">Günün Menüsü</span>
              <span className="ml-auto text-xs text-[#8A8580] font-mono">{menuItems.length} çeşit</span>
            </div>
          </div>
          {menuLoading ? (
            <div className="p-10 text-center text-[#8A8580]">Menü yükleniyor…</div>
          ) : menuItems.length === 0 ? (
            <div className="p-10 text-center text-[#8A8580]"><Utensils className="mx-auto mb-2" size={28} /><div>Bugün için menü henüz yayınlanmadı.</div></div>
          ) : (
            <div className="divide-y divide-[#E5DFD3]">
              {menuGroups.map(({ cat, items }) => (
                <div key={cat}>
                  <div className="px-5 py-2 bg-[#F2EBE3]/50">
                    <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#C05A46]">{cat}</span>
                  </div>
                  {items.map((item) => {
                    const inCart = cart.find((c) => c.id === item.id);
                    return (
                      <div key={item.id} className={`px-5 py-3 flex items-center gap-3 transition-colors ${inCart ? "bg-[#C05A46]/5" : "hover:bg-[#F9F6F0]"}`}>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#2C2A29] truncate">{item.name}</div>
                          {item.description && <div className="text-xs text-[#8A8580] truncate">{item.description}</div>}
                        </div>
                        {inCart ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => updateQty(item.id, inCart.quantity - 1)} className="w-8 h-8 rounded-full bg-[#F2EBE3] hover:bg-[#E5DFD3] grid place-items-center"><Minus size={14} /></button>
                            <span className="w-7 text-center font-bold text-sm">{inCart.quantity}</span>
                            <button onClick={() => updateQty(item.id, inCart.quantity + 1)} className="w-8 h-8 rounded-full bg-[#F2EBE3] hover:bg-[#E5DFD3] grid place-items-center"><Plus size={14} /></button>
                            <button onClick={() => removeFromCart(item.id)} className="text-[#8A8580] hover:text-[#B93A32] ml-1"><Trash2 size={14} /></button>
                          </div>
                        ) : (
                          <Button onClick={() => addToCart(item)} variant="outline" className="rounded-full border-[#E5DFD3] hover:border-[#C05A46] hover:text-[#C05A46] h-8 px-3 text-xs">
                            <Plus size={12} className="mr-1" /> Ekle
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sipariş formu */}
        <div className="xl:sticky xl:top-6 self-start">
          <div className="bg-white rounded-2xl border border-[#E5DFD3] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5DFD3] bg-[#2C2A29]">
              <div className="text-xs uppercase tracking-[0.2em] font-bold text-white flex items-center gap-2">
                <Building2 size={14} /> Sipariş Bilgileri
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">Firma Adı <span className="text-[#C05A46]">*</span></Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Firma adını yazın…" className="mt-1.5 rounded-lg border-[#E5DFD3] h-11 bg-[#F9F6F0] focus:bg-white" data-testid="manual-order-company-name" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">Seçilen Ürünler ({totalQty} adet)</Label>
                {cart.length === 0 ? (
                  <div className="mt-2 rounded-lg bg-[#F9F6F0] border border-dashed border-[#E5DFD3] p-4 text-center text-sm text-[#8A8580]">Menüden ürün ekleyin</div>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {cart.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 bg-[#F9F6F0] rounded-lg px-3 py-2 border border-[#E5DFD3]">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-[#2C2A29] truncate">{c.name}</div>
                          <div className="text-[10px] text-[#8A8580] uppercase tracking-wide">{c.category}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(c.id, c.quantity - 1)} className="w-6 h-6 rounded-full bg-white border border-[#E5DFD3] grid place-items-center hover:bg-[#E5DFD3]"><Minus size={10} /></button>
                          <span className="w-6 text-center text-xs font-bold">{c.quantity}</span>
                          <button onClick={() => updateQty(c.id, c.quantity + 1)} className="w-6 h-6 rounded-full bg-white border border-[#E5DFD3] grid place-items-center hover:bg-[#E5DFD3]"><Plus size={10} /></button>
                        </div>
                        <button onClick={() => removeFromCart(c.id)} className="text-[#8A8580] hover:text-[#B93A32]"><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Akşam Yemeği Toggle */}
              {cart.length > 0 && (
                <div>
                  <button
                    onClick={() => { setDinnerEnabled(!dinnerEnabled); if (dinnerEnabled) setDinnerItems([]); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      dinnerEnabled
                        ? "border-[#C05A46] bg-[#C05A46]/10"
                        : "border-[#E5DFD3] bg-[#F9F6F0] hover:border-[#C05A46]/40"
                    }`}
                    data-testid="manual-dinner-toggle"
                  >
                    <Moon size={18} className={dinnerEnabled ? "text-[#C05A46]" : "text-[#8A8580]"} />
                    <div className="flex-1 text-left">
                      <div className={`text-sm font-semibold ${dinnerEnabled ? "text-[#C05A46]" : "text-[#2C2A29]"}`}>
                        Akşam yemeği de istiyorum
                      </div>
                      <div className="text-[10px] text-[#8A8580]">Menüden akşam için ürün seçin</div>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors relative ${
                      dinnerEnabled ? "bg-[#C05A46]" : "bg-[#E5DFD3]"
                    }`}>
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                        dinnerEnabled ? "left-5" : "left-1"
                      }`} />
                    </div>
                  </button>

                  {dinnerEnabled && (
                    <div className="mt-3 bg-white rounded-xl border border-[#E5DFD3] overflow-hidden">
                      <div className="px-3 py-2 bg-[#2C2A29]">
                        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white flex items-center gap-1.5">
                          <Moon size={12} /> Akşam Yemeği Seçimi
                        </div>
                      </div>

                      {/* Seçilen akşam ürünleri */}
                      {dinnerItems.length > 0 && (
                        <div className="px-3 py-2 border-b border-[#E5DFD3] bg-[#C05A46]/5">
                          <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#C05A46] mb-1.5">Seçilenler</div>
                          {dinnerItems.map((di) => (
                            <div key={di.id} className="flex items-center gap-2 py-1.5">
                              <span className="flex-1 text-sm font-medium text-[#2C2A29] truncate">{di.name}</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => updateDinnerQty(di.id, di.quantity - 1)} className="w-6 h-6 rounded-full bg-white border border-[#E5DFD3] grid place-items-center hover:bg-[#F2EBE3]"><Minus size={10} /></button>
                                <span className="w-6 text-center text-xs font-bold">{di.quantity}</span>
                                <button onClick={() => updateDinnerQty(di.id, di.quantity + 1)} className="w-6 h-6 rounded-full bg-white border border-[#E5DFD3] grid place-items-center hover:bg-[#F2EBE3]"><Plus size={10} /></button>
                              </div>
                              <button onClick={() => removeDinnerItem(di.id)} className="text-[#8A8580] hover:text-[#B93A32]"><Trash2 size={12} /></button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Menüden ekle */}
                      <div className="px-3 py-2 max-h-48 overflow-y-auto">
                        <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#8A8580] mb-1.5">Menüden Ekle</div>
                        {menuItems
                          .filter((m) => !dinnerItems.some((di) => di.id === m.id))
                          .map((m) => (
                            <button
                              key={m.id}
                              onClick={() => addDinnerItem(m)}
                              className="w-full flex items-center gap-2 py-1.5 text-left hover:bg-[#F2EBE3] rounded px-1 transition-colors"
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

              <div>
                <Label className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">Sipariş Notu</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="İsteğe bağlı not…" className="mt-1.5 rounded-lg border-[#E5DFD3] bg-[#F9F6F0] focus:bg-white" rows={2} data-testid="manual-order-note" />
              </div>
            </div>
            <div className="p-5 pt-0">
              <Button onClick={submitOrder} disabled={submitting || !companyName.trim() || cart.length === 0} className="w-full h-12 bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full font-semibold text-base disabled:opacity-50" data-testid="manual-order-submit">
                {submitting ? (<><Loader2 size={16} className="mr-2 animate-spin" /> Gönderiliyor…</>) : (<><Send size={16} className="mr-2" /> Siparişi Oluştur ({totalQty} adet)</>)}
              </Button>
              <div className="text-[10px] text-[#8A8580] text-center mt-2">Yazıcı otomatik algılayıp fişi yazdıracak · Kişisel bilgiler fişte gösterilmez</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════
   TAB 2 — GEÇMİŞ + GÜN SONU ÖZETİ
   ═══════════════════════════════════════════════ */
function HistoryTab() {
  const [date, setDate] = useState(todayISO());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Summary modal
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryPrinting, setSummaryPrinting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/manual-orders?date=${date}`)
      .then((r) => setOrders(r.data))
      .catch(() => toast.error("Manuel siparişler yüklenemedi"))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get(`/admin/manual-orders/summary?date=${date}`);
      setSummary(res.data);
      setSummaryOpen(true);
    } catch { toast.error("Özet yüklenemedi"); }
    finally { setSummaryLoading(false); }
  };

  const printSummary = async () => {
    setSummaryPrinting(true);
    try {
      await api.post(`/admin/manual-orders/summary/print?date=${date}`);
      toast.success("Manuel sipariş özet fişi yazıcıya gönderildi");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Yazdırma hatası");
    } finally { setSummaryPrinting(false); }
  };

  const totalItems = orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0);

  return (
    <>
      {/* Filtre + Aksiyonlar */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <Label className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">Tarih</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 rounded-lg border-[#E5DFD3] h-11 bg-white" />
        </div>
        <Button onClick={load} variant="outline" className="rounded-full border-[#E5DFD3] h-11">
          <History size={14} className="mr-2" /> Yenile
        </Button>
        <Button onClick={loadSummary} disabled={summaryLoading} className="rounded-full bg-[#2C2A29] hover:bg-[#1a1918] text-white h-11">
          <BarChart3 size={14} className="mr-2" /> {summaryLoading ? "Yükleniyor…" : "Gün Sonu Özeti"}
        </Button>
        {/* Toplam kutucuğu */}
        <div className="ml-auto bg-[#C05A46]/10 border border-[#C05A46]/30 rounded-xl px-4 py-2 text-center">
          <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#C05A46]">Toplam</div>
          <div className="font-heading text-2xl font-bold text-[#2C2A29]">{orders.length} sipariş · {totalItems} adet</div>
        </div>
      </div>

      {/* Sipariş listesi */}
      <div className="space-y-3">
        {loading && orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5DFD3] p-10 text-center text-[#8A8580]">Yükleniyor…</div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5DFD3] p-10 text-center text-[#8A8580]">Bu tarihte manuel sipariş yok.</div>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-[#E5DFD3] p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#4A7C9D]/10 grid place-items-center font-mono font-bold text-[#4A7C9D] text-sm">
                  #{o.order_no}
                </div>
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading text-lg font-bold text-[#2C2A29]">{o.company_name}</span>
                    <span className="inline-flex items-center gap-1 bg-[#4A7C9D]/15 text-[#2F587A] text-[10px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-full border border-[#4A7C9D]/30">✏️ Manuel</span>
                  </div>
                  <div className="text-sm text-[#8A8580] flex items-center gap-1 mt-0.5"><Clock size={12} /> {formatTimeTR(o.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className="font-heading text-2xl font-bold text-[#2C2A29]">{o.items.reduce((s, i) => s + i.quantity, 0)}</div>
                  <div className="text-xs text-[#8A8580] uppercase tracking-[0.15em]">adet</div>
                </div>
              </div>
              {/* Ürünler */}
              <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1">
                {o.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-sm border-b border-dashed border-[#E5DFD3] py-1">
                    <span>{it.name}</span>
                    <span className="font-bold text-[#2C2A29]">× {it.quantity}</span>
                  </div>
                ))}
              </div>
              {o.note && (
                <div className="mt-3 bg-[#F2EBE3] rounded-lg px-3 py-2 text-sm text-[#2C2A29]">
                  <span className="font-bold">Not:</span> {o.note}
                </div>
              )}
              {o.meal_time && o.meal_time !== "Öğle" && (
                <div className="mt-3 bg-[#2C2A29] rounded-lg px-3 py-2 text-sm text-white">
                  <span className="font-bold">🌙 Akşam Yemeği İsteği:</span> {o.meal_time}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Gün Sonu Özet Modalı */}
      {summaryOpen && summary && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSummaryOpen(false)}>
          <div className="bg-white rounded-2xl border border-[#E5DFD3] max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5DFD3] flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#C05A46]">Manuel Sipariş Özeti</div>
                <div className="font-heading text-xl font-bold text-[#2C2A29] mt-1">{summary.date}</div>
              </div>
              <button onClick={() => setSummaryOpen(false)} className="w-8 h-8 rounded-full bg-[#F2EBE3] grid place-items-center hover:bg-[#E5DFD3]"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {summary.companies.length === 0 ? (
                <div className="text-center text-[#8A8580] py-8">Bu tarihte manuel sipariş yok.</div>
              ) : (
                <div className="space-y-3">
                  {summary.companies.map((c) => (
                    <div key={c.company} className="bg-[#F9F6F0] rounded-xl border border-[#E5DFD3] p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-heading text-lg font-bold text-[#2C2A29]">{c.company}</div>
                        <div className="font-heading text-2xl font-bold text-[#C05A46]">{c.total}</div>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm text-[#5C5855]">
                        <span>🍽️ Öğle: <strong>{c.lunch_qty}</strong></span>
                        {c.dinner_qty > 0 && <span>🌙 Akşam: <strong>{c.dinner_qty}</strong></span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#E5DFD3] bg-[#2C2A29] rounded-b-2xl">
              <div className="flex items-center justify-between text-white">
                <div className="text-sm font-bold uppercase tracking-[0.15em]">Genel Toplam</div>
                <div className="font-heading text-3xl font-bold">{summary.grand_total.total}</div>
              </div>
              <div className="flex gap-4 mt-1 text-sm text-[#8A8580]">
                <span>🍽️ Öğle: {summary.grand_total.lunch}</span>
                {summary.grand_total.dinner > 0 && <span>🌙 Akşam: {summary.grand_total.dinner}</span>}
              </div>
              <Button onClick={printSummary} disabled={summaryPrinting} className="mt-3 w-full bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full h-10">
                <Printer size={14} className="mr-2" /> {summaryPrinting ? "Yazdırılıyor…" : "Özet Fişini Yazdır"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
