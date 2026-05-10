import { useEffect, useState } from "react";
import { api, formatApiErrorDetail, todayISO } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Utensils } from "lucide-react";


const CATEGORIES = ["Çorba", "Ana Yemek", "Yan Yemek", "İçecek", "Tatlı"];

const empty = { name: "", description: "", category: "Ana Yemek", available: true, available_date: todayISO() };

export default function AdminMenu() {
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [catalog, setCatalog] = useState([]);

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

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-2">Menü Yönetimi</div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-[#2C2A29]">Günün yemeklerini yayınlayın</h1>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">Tarih</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 rounded-lg border-[#E5DFD3] h-11 bg-white" data-testid="admin-menu-date-filter" />
          </div>
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
            <p className="text-[#5C5855] mt-1">Yeni yemek ekleyerek menüyü yayınlayın.</p>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-white" data-testid="admin-menu-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">{editing ? "Yemeği Düzenle" : "Yeni Yemek Ekle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editing && catalog.length > 0 && (
              <div className="p-4 bg-[#F2EBE3]/50 rounded-lg border border-[#E5DFD3] mb-2">
                <Label className="text-[#C05A46] font-bold">Yemek Havuzundan Seç (Hızlı Doldur)</Label>
                <Select onValueChange={(val) => {
                  const item = catalog.find(c => c.id === val);
                  if (item) setForm({...form, name: item.name, description: item.description, category: item.category});
                }}>
                  <SelectTrigger className="mt-1 bg-white border-[#E5DFD3]">
                    <SelectValue placeholder="Hazır şablonlardan birini seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => {
                      const catItems = catalog.filter(c => c.category === cat);
                      if (catItems.length === 0) return null;
                      return (
                        <SelectGroup key={cat}>
                          <SelectLabel className="text-xs uppercase tracking-[0.1em] text-[#8A8580]">{cat}</SelectLabel>
                          {catItems.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
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
    </div>
  );
}
