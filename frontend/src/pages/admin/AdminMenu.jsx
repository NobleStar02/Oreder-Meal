import { useEffect, useRef, useState } from "react";
import { api, fileUrl, formatTRY, formatApiErrorDetail } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Utensils } from "lucide-react";

const todayISO = () => new Date().toISOString().slice(0, 10);

const empty = { name: "", description: "", price: "", category: "Ana Yemek", available: true, image_path: null, available_date: todayISO() };

export default function AdminMenu() {
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = () => {
    setLoading(true);
    api.get(`/admin/menu?date=${date}`).then((r) => setItems(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  const openNew = () => { setEditing(null); setForm({ ...empty, available_date: date }); setOpen(true); };
  const openEdit = (it) => { setEditing(it); setForm({ ...it, price: String(it.price) }); setOpen(true); };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm((f) => ({ ...f, image_path: data.path }));
      toast.success("Görsel yüklendi");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category: form.category,
        available: form.available,
        image_path: form.image_path,
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
                {it.image_path ? (
                  <img src={fileUrl(it.image_path)} alt="" className="w-14 h-14 rounded-lg object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-[#F2EBE3] grid place-items-center text-[#C05A46]"><Utensils size={20} /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#2C2A29] truncate">{it.name}</div>
                  <div className="text-sm text-[#8A8580] truncate">{it.category} · {it.description || "—"}</div>
                </div>
                <div className="hidden sm:block font-heading font-bold text-[#C05A46]">{formatTRY(it.price)}</div>
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
            <div>
              <Label>Görsel</Label>
              <div className="mt-2 flex items-center gap-3">
                {form.image_path ? (
                  <img src={fileUrl(form.image_path)} alt="" className="w-20 h-20 rounded-lg object-cover border border-[#E5DFD3]" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-[#F2EBE3] grid place-items-center text-[#C05A46]"><Utensils size={24} /></div>
                )}
                <div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-full border-[#E5DFD3]" data-testid="admin-menu-upload-image">
                    <Upload size={14} className="mr-2" /> {uploading ? "Yükleniyor…" : "Görsel Yükle"}
                  </Button>
                  <div className="text-xs text-[#8A8580] mt-1">JPG/PNG, en fazla 5MB</div>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="name">İsim *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 rounded-lg border-[#E5DFD3]" data-testid="admin-menu-name-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="price">Fiyat (₺) *</Label>
                <Input id="price" type="number" step="0.5" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1 rounded-lg border-[#E5DFD3]" data-testid="admin-menu-price-input" />
              </div>
              <div>
                <Label htmlFor="category">Kategori</Label>
                <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 rounded-lg border-[#E5DFD3]" placeholder="Ana Yemek, Çorba…" data-testid="admin-menu-category-input" />
              </div>
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
            <Button onClick={save} disabled={!form.name || !form.price} className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full" data-testid="admin-menu-save-button">
              {editing ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
