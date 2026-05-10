import { useEffect, useState } from "react";
import { api, formatApiErrorDetail, todayISO } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Utensils, Library, Check, Loader2 } from "lucide-react";

const CATEGORIES = ["Çorba", "Ana Yemek", "Yan Yemek", "İçecek", "Tatlı"];
const CAT_EMOJI = { "Çorba": "🍲", "Ana Yemek": "🥩", "Yan Yemek": "🥗", "İçecek": "🥤", "Tatlı": "🍰" };

const empty = { name: "", description: "", category: "Ana Yemek", available: true, available_date: todayISO() };

export default function AdminMenu() {
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  // Havuzdan Hızlı Ekle
  const [catalog, setCatalog] = useState([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [adding, setAdding] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/admin/menu?date=${date}`).then((r) => setItems(r.data)).finally(() => setLoading(false));
    api.get(`/admin/catalog`).then((r) => setCatalog(r.data)).catch(console.error);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  const openNew = () => { setEditing(null); setForm({ ...empty, available_date: date }); setOpen(true); };
  const openEdit = (it) => {
    setEditing(it);
    setForm({
      name: it.name || "",
      description: it.description || "",
      category: CATEGORIES.includes(it.category) ? it.category : "Ana Yemek",
      available: it.available !== false,
      available_date: it.available_date || todayISO(),
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        available: form.available,
        available_date: form.available_date,
      };
      if (editing) {
        await api.put(`/admin/menu/${editing.id}`, payload);
        toast.success("Yemek güncellendi");
      } else {
        await api.post("/admin/menu", payload);
        toast.success("Yemek eklendi");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const remove = async (it) => {
    if (!window.confirm(`"${it.name}" silinsin mi?`)) return;
    try {
      await api.delete(`/admin/menu/${it.id}`);
      toast.success("Silindi");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  // ---- Havuzdan toplu ekleme ----
  const openCatalog = () => {
    // Menüde zaten olan yemek isimlerini bul, onları pre-check etme
    setSelected(new Set());
    setCatalogOpen(true);
  };

  const toggleItem = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addSelectedToMenu = async () => {
    if (selected.size === 0) return;
    setAdding(true);
    const toAdd = catalog.filter(c => selected.has(c.id));
    let ok = 0;
    let fail = 0;
    for (const item of toAdd) {
      try {
        await api.post("/admin/menu", {
          name: item.name,
          description: item.description,
          category: item.category,
          available: true,
          available_date: date,
        });
        ok++;
      } catch {
        fail++;
      }
    }
    setAdding(false);
    setCatalogOpen(false);
    setSelected(new Set());
    load();
    if (ok > 0) toast.success(`${ok} yemek menüye eklendi`);
    if (fail > 0) toast.error(`${fail} yemek eklenemedi`);
  };

  // Menüdeki mevcut yemek isimleri (havuzda gri göstermek için)
  const existingNames = new Set(items.map(i => i.name));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-2">Günlük Menü</div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-[#2C2A29]">Günün yemeklerini yayınlayın</h1>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">Tarih</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 rounded-lg border-[#E5DFD3] h-11 bg-white" data-testid="admin-menu-date-filter" />
          </div>
          {catalog.length > 0 && (
            <Button onClick={openCatalog} variant="outline" className="rounded-full h-11 px-5 border-[#C05A46] text-[#C05A46] hover:bg-[#C05A46] hover:text-white">
              <Library size={16} className="mr-2" /> Havuzdan Ekle
            </Button>
          )}
          <Button onClick={openNew} className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full h-11 px-5" data-testid="admin-menu-new-button">
            <Plus size={16} className="mr-2" /> Yeni Yemek
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5DFD3] overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[#8A8580]">Yükleniyor…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Utensils className="mx-auto text-[#C05A46] mb-3" size={32} />
            <div className="font-heading text-xl font-bold">Bu tarih için yemek yok</div>
            <p className="text-[#5C5855] mt-1">
              {catalog.length > 0
                ? "\"Havuzdan Ekle\" ile yemek havuzundan hızlıca seçim yapabilirsiniz."
                : "Yeni yemek ekleyerek menüyü yayınlayın."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#E5DFD3]">
            {items.map((it) => (
              <li key={it.id} className="p-4 flex items-center gap-4" data-testid={`admin-menu-row-${it.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#2C2A29] truncate">{it.name}</div>
                  <div className="text-sm text-[#8A8580] truncate">{it.description || "—"}</div>
                </div>
                <span className="hidden sm:inline-block text-[10px] uppercase tracking-[0.2em] font-bold text-[#C05A46] bg-[#C05A46]/10 px-2.5 py-1 rounded-full">{it.category}</span>
                <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${it.available ? "bg-[#4A5D23]/15 text-[#3A4A1A]" : "bg-[#8A8580]/15 text-[#5C5855]"}`}>
                  {it.available ? "Aktif" : "Pasif"}
                </span>
                <Button variant="ghost" size="icon" onClick={() => openEdit(it)} data-testid={`admin-menu-edit-${it.id}`}><Pencil size={16} /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(it)} className="text-[#B93A32]" data-testid={`admin-menu-delete-${it.id}`}><Trash2 size={16} /></Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ===== Manuel Ekleme / Düzenleme Dialog ===== */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-white" data-testid="admin-menu-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">{editing ? "Yemeği Düzenle" : "Yeni Yemek Ekle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="name">İsim *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 rounded-lg border-[#E5DFD3]" data-testid="admin-menu-name-input" />
            </div>
            <div>
              <Label htmlFor="category">Kategori *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger id="category" className="mt-1 rounded-lg border-[#E5DFD3] h-11" data-testid="admin-menu-category-select">
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} data-testid={`admin-menu-category-option-${c}`}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="desc">Açıklama</Label>
              <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 rounded-lg border-[#E5DFD3]" data-testid="admin-menu-desc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label htmlFor="adate">Yayın Tarihi</Label>
                <Input id="adate" type="date" value={form.available_date} onChange={(e) => setForm({ ...form, available_date: e.target.value })} className="mt-1 rounded-lg border-[#E5DFD3]" data-testid="admin-menu-date-input" />
              </div>
              <div className="flex items-center justify-between bg-[#F9F6F0] rounded-lg px-4 py-3 border border-[#E5DFD3]">
                <span className="text-sm font-semibold">Aktif</span>
                <Switch checked={form.available} onCheckedChange={(v) => setForm({ ...form, available: v })} data-testid="admin-menu-available-switch" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-full border-[#E5DFD3]">Vazgeç</Button>
            <Button onClick={save} disabled={!form.name || !form.category} className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full" data-testid="admin-menu-save-button">
              {editing ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Havuzdan Hızlı Seçim Dialog ===== */}
      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent className="max-w-2xl bg-white max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl flex items-center gap-2">
              <Library size={22} className="text-[#C05A46]" /> Havuzdan Hızlı Ekle
            </DialogTitle>
            <p className="text-sm text-[#8A8580] mt-1">
              Eklemek istediğiniz yemekleri işaretleyin, sonra "Seçilenleri Ekle" butonuna basın.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6 py-2 space-y-5">
            {CATEGORIES.map(cat => {
              const catItems = catalog.filter(c => c.category === cat);
              if (catItems.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{CAT_EMOJI[cat]}</span>
                    <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">{cat}</span>
                    <span className="text-[10px] text-[#8A8580] bg-[#F2EBE3] rounded-full px-2 py-0.5">{catItems.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {catItems.map(item => {
                      const isSelected = selected.has(item.id);
                      const alreadyInMenu = existingNames.has(item.name);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={alreadyInMenu}
                          onClick={() => toggleItem(item.id)}
                          className={`
                            relative text-left p-3 rounded-xl border-2 transition-all duration-150
                            ${alreadyInMenu
                              ? "border-[#E5DFD3] bg-[#F9F6F0] opacity-50 cursor-not-allowed"
                              : isSelected
                                ? "border-[#C05A46] bg-[#C05A46]/5 shadow-sm"
                                : "border-[#E5DFD3] bg-white hover:border-[#C05A46]/40 hover:shadow-sm cursor-pointer"
                            }
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`
                              mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors
                              ${alreadyInMenu
                                ? "border-[#8A8580]/30 bg-[#8A8580]/10"
                                : isSelected
                                  ? "border-[#C05A46] bg-[#C05A46]"
                                  : "border-[#E5DFD3]"
                              }
                            `}>
                              {(isSelected || alreadyInMenu) && <Check size={12} className={alreadyInMenu ? "text-[#8A8580]" : "text-white"} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`font-semibold text-sm truncate ${alreadyInMenu ? "text-[#8A8580]" : "text-[#2C2A29]"}`}>
                                {item.name}
                              </div>
                              {item.description && (
                                <div className="text-xs text-[#8A8580] truncate mt-0.5">{item.description}</div>
                              )}
                            </div>
                          </div>
                          {alreadyInMenu && (
                            <div className="absolute top-2 right-2 text-[9px] uppercase tracking-wider font-bold text-[#8A8580] bg-[#E5DFD3] px-1.5 py-0.5 rounded">
                              menüde var
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="border-t border-[#E5DFD3] pt-4 mt-2">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-[#5C5855]">
                {selected.size > 0
                  ? <><strong className="text-[#C05A46]">{selected.size}</strong> yemek seçildi</>
                  : "Henüz seçim yapılmadı"}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCatalogOpen(false)} className="rounded-full border-[#E5DFD3]">Vazgeç</Button>
                <Button
                  onClick={addSelectedToMenu}
                  disabled={selected.size === 0 || adding}
                  className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full px-6"
                >
                  {adding ? <><Loader2 size={16} className="mr-2 animate-spin" /> Ekleniyor…</> : <>Seçilenleri Ekle ({selected.size})</>}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
