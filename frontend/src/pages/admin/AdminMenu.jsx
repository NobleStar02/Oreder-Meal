import { useEffect, useState, useCallback, useMemo } from "react";
import { api, formatApiErrorDetail, todayISO } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../../components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Utensils, Library, Check, Loader2, Search } from "lucide-react";

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

  // Silme onay dialog
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Havuzdan Hızlı Ekle
  const [catalog, setCatalog] = useState([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/menu?date=${date}`).then((r) => setItems(r.data)).finally(() => setLoading(false));
    api.get(`/admin/catalog`).then((r) => setCatalog(r.data)).catch(console.error);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

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

  const confirmRemove = (it) => {
    setDeleteTarget(it);
    setShowDeleteDialog(true);
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin/menu/${deleteTarget.id}`);
      toast.success("Silindi");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setShowDeleteDialog(false);
      setDeleteTarget(null);
    }
  };

  // ---- Havuzdan toplu ekleme ----
  const openCatalog = () => {
    setSelected(new Set());
    setSearchQuery("");
    setCatalogOpen(true);
  };

  const toggleItem = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addSelectedToMenu = useCallback(async () => {
    if (selected.size === 0) return;
    setAdding(true);
    const toAdd = catalog.filter(c => selected.has(c.id));
    const payload = toAdd.map(item => ({
      name: item.name,
      description: item.description || "",
      price: 0.0,
      category: item.category || "Ana Yemek",
      available: true,
      available_date: date,
    }));
    try {
      await api.post("/admin/menu/batch", payload);
      toast.success(`${payload.length} yemek menüye eklendi`);
      setCatalogOpen(false);
      setSelected(new Set());
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Yemekler eklenirken hata oluştu");
    } finally {
      setAdding(false);
    }
  }, [selected, catalog, date, load]);

  // Menüdeki mevcut yemek isimleri (havuzda gri göstermek için)
  const existingNames = useMemo(() => new Set(items.map(i => i.name)), [items]);

  const filteredCatalog = useMemo(() => {
    const filtered = catalog.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      const ra = CATEGORIES.indexOf(a.category);
      const rb = CATEGORIES.indexOf(b.category);
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name, "tr");
    });
  }, [catalog, searchQuery]);

  const selectAllVisible = useCallback(() => {
    const visibleIds = filteredCatalog
      .filter(item => !existingNames.has(item.name))
      .map(item => item.id);
    setSelected(new Set(visibleIds));
  }, [filteredCatalog, existingNames]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  useEffect(() => {
    if (!catalogOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        addSelectedToMenu();
      } else if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        selectAllVisible();
      } else if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        clearSelection();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [catalogOpen, filteredCatalog, existingNames, addSelectedToMenu, selectAllVisible, clearSelection]);

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
                <Button variant="ghost" size="icon" onClick={() => confirmRemove(it)} className="text-[#B93A32]" data-testid={`admin-menu-delete-${it.id}`}><Trash2 size={16} /></Button>
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

          {/* Arama Kutusu */}
          <div className="relative mt-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8580] w-4.5 h-4.5" />
            <Input
              type="text"
              placeholder="Yemek havuzunda ara (isim, açıklama veya kategori)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-xl border-[#E5DFD3] focus-visible:ring-1 focus-visible:ring-[#C05A46] focus-visible:border-[#C05A46] bg-[#F9F6F0]/40"
              autoFocus
            />
          </div>

          {/* Hızlı İşlem Butonları */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5DFD3] mt-2 mb-1">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllVisible}
                disabled={filteredCatalog.filter(item => !existingNames.has(item.name)).length === 0}
                className="rounded-full text-xs h-8 border-[#E5DFD3] text-[#5C5855] hover:bg-[#F9F6F0]"
              >
                Görünenleri Seç
                <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono bg-[#E5DFD3] text-[#5C5855] rounded shadow-sm">
                  Ctrl+A
                </span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={selected.size === 0}
                className="rounded-full text-xs h-8 border-[#E5DFD3] text-[#5C5855] hover:bg-[#F9F6F0]"
              >
                Seçimi Temizle
                <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono bg-[#E5DFD3] text-[#5C5855] rounded shadow-sm">
                  Ctrl+D
                </span>
              </Button>
            </div>
            {searchQuery && (
              <span className="text-xs text-[#8A8580] italic">
                {filteredCatalog.length} yemek bulundu
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto -mx-6 px-6 py-2 space-y-5">
            {filteredCatalog.length === 0 ? (
              <div className="py-12 text-center text-[#8A8580]">
                <Search size={32} className="mx-auto text-[#C05A46]/60 mb-2" />
                <div className="font-heading font-bold text-lg text-[#2C2A29]">Yemek bulunamadı</div>
                <p className="text-sm mt-1 text-[#8A8580]">
                  Arama kriterlerinize uygun yemek havuzunda kayıt bulunmamaktadır.
                </p>
              </div>
            ) : (
              CATEGORIES.map(cat => {
                const catItems = filteredCatalog.filter(c => c.category === cat);
                if (catItems.length === 0) return null;
                return (
                  <div key={cat} className="space-y-2">
                    <div className="flex items-center gap-2">
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
                              relative text-left p-3 rounded-xl border-2 transition-all duration-150 w-full
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
              })
            )}
          </div>

          <DialogFooter className="border-t border-[#E5DFD3] pt-4 mt-2">
            <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
              <div className="flex flex-col items-start gap-1">
                <span className="text-sm text-[#5C5855] text-left">
                  {selected.size > 0 ? (
                    <>
                      <strong className="text-[#C05A46]">{selected.size}</strong> yemek seçildi
                    </>
                  ) : (
                    "Henüz seçim yapılmadı"
                  )}
                </span>
                {selected.size > 0 && (
                  <span className="text-[11px] text-[#8A8580] flex items-center gap-1">
                    Onaylamak için 
                    <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-[#F2EBE3] border border-[#E5DFD3] text-[#5C5855] rounded shadow-sm">
                      Ctrl + Enter
                    </kbd>
                  </span>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button variant="outline" onClick={() => setCatalogOpen(false)} className="rounded-full border-[#E5DFD3]">Vazgeç</Button>
                <Button
                  onClick={addSelectedToMenu}
                  disabled={selected.size === 0 || adding}
                  className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full px-6 transition-all"
                >
                  {adding ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" /> Ekleniyor…
                    </>
                  ) : (
                    <>Seçilenleri Ekle ({selected.size})</>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Silme Onay AlertDialog ===== */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-xl">Menüden Kaldırılsın mı?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#5C5855] text-sm">
              <strong className="text-[#2C2A29]">"{deleteTarget?.name}"</strong> yemeği bugünün menüsünden kaldırılacaktır. 
              <span className="block mt-2 font-medium text-[#C05A46]">
                Not: Bu işlem yemeği yemek havuzu kataloğundan silmez, sadece bugünkü menüden çıkarır.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border-[#E5DFD3]" onClick={() => { setShowDeleteDialog(false); setDeleteTarget(null); }}>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-[#B93A32] hover:bg-[#9C302A] text-white rounded-full" onClick={remove}>Menüden Kaldır</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
