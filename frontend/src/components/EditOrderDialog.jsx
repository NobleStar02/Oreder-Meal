import { useEffect, useMemo, useState } from "react";
import { api, CATEGORY_ORDER, categoryRank, formatApiErrorDetail, groupByCategory } from "../lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Plus, Minus, Trash2, Utensils, Moon } from "lucide-react";
import { toast } from "sonner";

/**
 * EditOrderDialog — allows a company to correct a "yeni" status order.
 * Loads today's menu, lets the user adjust quantities, add/remove dishes, and edit the note.
 */
export default function EditOrderDialog({ open, onOpenChange, order, onSaved }) {
  const [menu, setMenu] = useState([]);
  const [items, setItems] = useState([]); // { id, name, category, quantity }
  const [note, setNote] = useState("");
  const [dinnerEnabled, setDinnerEnabled] = useState(false);
  const [dinnerItemIds, setDinnerItemIds] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !order) return;
    setItems(order.items.map((i) => ({
      id: i.menu_item_id,
      name: i.name,
      category: i.category || "Ana Yemek",
      quantity: i.quantity,
    })));
    setNote(order.note || "");
    // meal_time dolu ise akşam yemeği isteği var demektir
    const mt = order.meal_time || "";
    if (mt) {
      setDinnerEnabled(true);
      // Eşleşen item ID'lerini bul
      const names = mt.split(",").map(s => s.replace(/\s*x\d+$/, "").trim().toLowerCase());
      const ids = new Set();
      order.items.forEach(i => {
        if (names.includes((i.name || "").toLowerCase())) ids.add(i.menu_item_id);
      });
      setDinnerItemIds(ids);
    } else {
      setDinnerEnabled(false);
      setDinnerItemIds(new Set());
    }
    api.get("/menu/today").then((r) => setMenu(r.data)).catch(() => setMenu([]));
  }, [open, order]);

  const changeQty = (id, delta) => {
    setItems((prev) =>
      prev
        .map((i) => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
        .filter((i) => i.quantity > 0)
    );
  };

  const addFromMenu = (m) => {
    setItems((prev) => {
      const ex = prev.find((i) => i.id === m.id);
      if (ex) return prev.map((i) => i.id === m.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: m.id, name: m.name, category: m.category || "Ana Yemek", quantity: 1 }];
    });
  };

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id));

  const save = async () => {
    if (!items.length) {
      toast.error("Sipariş en az bir kalem içermelidir");
      return;
    }
    setSaving(true);
    try {
      // Akşam yemeği özetini oluştur
      const dinnerSummary = dinnerEnabled && dinnerItemIds.size > 0
        ? items.filter(i => dinnerItemIds.has(i.id)).map(i => `${i.name} x${i.quantity}`).join(", ")
        : "";
      await api.put(`/orders/${order.id}`, {
        items: items.map((i) => ({ menu_item_id: i.id, quantity: i.quantity })),
        note,
        meal_time: dinnerSummary,
      });
      toast.success("Sipariş güncellendi. Mutfağa DÜZELTİLDİ notuyla iletiliyor.");
      onOpenChange(false);
      onSaved && onSaved();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setSaving(false);
    }
  };

  const groupedItems = useMemo(() => groupByCategory(items), [items]);

  const groupedMenu = useMemo(() => {
    const inCart = new Set(items.map((i) => i.id));
    const available = menu.filter((m) => !inCart.has(m.id));
    const groups = CATEGORY_ORDER
      .map((cat) => ({ cat, items: available.filter((i) => (i.category || "Ana Yemek") === cat) }))
      .filter((g) => g.items.length > 0);
    return groups;
  }, [menu, items]);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-hidden flex flex-col" data-testid="edit-order-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Siparişi Düzenle — #{order.order_no}</DialogTitle>
          <p className="text-sm text-[#5C5855] mt-1">Adetleri değiştirin veya yeni yemek ekleyin. Kaydettiğinizde mutfağa "DÜZELTİLDİ" notuyla tekrar iletilir.</p>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-6 py-2">
          {/* Current items */}
          <div>
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#C05A46] mb-3">Sipariş Kalemleri</div>
            {groupedItems.length === 0 ? (
              <div className="text-sm text-[#8A8580] bg-[#F9F6F0] rounded-lg p-4 text-center">
                Sipariş boş. Aşağıdan yemek ekleyin.
              </div>
            ) : (
              <div className="space-y-4">
                {groupedItems.map(({ cat, items: catItems }) => (
                  <div key={cat}>
                    <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#8A8580] mb-1.5">{cat}</div>
                    <ul className="space-y-2">
                      {catItems.map((i) => (
                        <li key={i.id} className="flex items-center gap-3 bg-[#F9F6F0] rounded-lg border border-[#E5DFD3] p-3" data-testid={`edit-order-item-${i.id}`}>
                          <div className="flex-1 min-w-0 text-sm font-semibold text-[#2C2A29] truncate">{i.name}</div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => changeQty(i.id, -1)} className="w-7 h-7 rounded-full bg-white border border-[#E5DFD3] grid place-items-center hover:bg-[#F2EBE3]" data-testid={`edit-order-decrease-${i.id}`}><Minus size={12} /></button>
                            <span className="w-7 text-center text-sm font-bold">{i.quantity}</span>
                            <button onClick={() => changeQty(i.id, 1)} className="w-7 h-7 rounded-full bg-white border border-[#E5DFD3] grid place-items-center hover:bg-[#F2EBE3]" data-testid={`edit-order-increase-${i.id}`}><Plus size={12} /></button>
                          </div>
                          <button onClick={() => removeItem(i.id)} className="text-[#8A8580] hover:text-[#B93A32] ml-1" data-testid={`edit-order-remove-${i.id}`}><Trash2 size={14} /></button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add from today's menu */}
          {groupedMenu.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#C05A46] mb-3">Bugünün Menüsünden Ekle</div>
              <div className="space-y-4">
                {groupedMenu.map(({ cat, items: catItems }) => (
                  <div key={cat}>
                    <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#8A8580] mb-1.5">{cat}</div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {catItems.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => addFromMenu(m)}
                          className="flex items-center gap-2 bg-white border border-[#E5DFD3] rounded-lg p-3 text-left hover:border-[#C05A46] hover:bg-[#F2EBE3]/40 transition-colors"
                          data-testid={`edit-order-add-${m.id}`}
                        >
                          <Utensils size={14} className="text-[#C05A46] shrink-0" />
                          <span className="flex-1 min-w-0 text-sm font-semibold truncate">{m.name}</span>
                          <Plus size={14} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#C05A46] mb-2 block">Sipariş Notu</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg border-[#E5DFD3]" placeholder="Özel istekler…" data-testid="edit-order-note" />
          </div>

          {/* Akşam Yemeği */}
          {items.length > 0 && (
            <div>
              <button
                onClick={() => {
                  setDinnerEnabled(!dinnerEnabled);
                  if (dinnerEnabled) setDinnerItemIds(new Set());
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  dinnerEnabled
                    ? "border-[#C05A46] bg-[#C05A46]/10"
                    : "border-[#E5DFD3] bg-white hover:border-[#C05A46]/40"
                }`}
              >
                <Moon size={16} className={dinnerEnabled ? "text-[#C05A46]" : "text-[#8A8580]"} />
                <span className={`flex-1 text-left text-sm font-semibold ${dinnerEnabled ? "text-[#C05A46]" : "text-[#2C2A29]"}`}>
                  Akşam yemeği de istiyorum
                </span>
                <div className={`w-10 h-6 rounded-full transition-colors relative ${dinnerEnabled ? "bg-[#C05A46]" : "bg-[#E5DFD3]"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${dinnerEnabled ? "left-5" : "left-1"}`} />
                </div>
              </button>
              {dinnerEnabled && (
                <div className="mt-2 bg-[#F9F6F0] rounded-xl border border-[#E5DFD3] p-3 space-y-1.5">
                  <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8A8580] mb-1">Akşama hangi yemekleri istiyorsunuz?</div>
                  {items.map((i) => (
                    <label key={i.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${dinnerItemIds.has(i.id) ? "bg-[#C05A46]/10" : "hover:bg-[#F2EBE3]"}`}>
                      <input
                        type="checkbox"
                        checked={dinnerItemIds.has(i.id)}
                        onChange={() => {
                          setDinnerItemIds(prev => {
                            const next = new Set(prev);
                            if (next.has(i.id)) next.delete(i.id);
                            else next.add(i.id);
                            return next;
                          });
                        }}
                        className="w-4 h-4 rounded border-[#E5DFD3] text-[#C05A46] focus:ring-[#C05A46]"
                      />
                      <span className="flex-1 text-sm font-medium text-[#2C2A29]">{i.name}</span>
                      <span className="text-xs text-[#8A8580]">x{i.quantity}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-[#E5DFD3] pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full border-[#E5DFD3]">Vazgeç</Button>
          <Button onClick={save} disabled={saving || !items.length} className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full" data-testid="edit-order-save">
            {saving ? "Kaydediliyor…" : "Düzeltmeyi Gönder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
