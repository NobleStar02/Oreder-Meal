import { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Library } from "lucide-react";

const CATEGORIES = ["Çorba", "Ana Yemek", "Yan Yemek", "İçecek", "Tatlı"];

const empty = { name: "", description: "", category: "Ana Yemek" };

export default function AdminCatalog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [filterCat, setFilterCat] = useState("all");

  const load = () => {
    setLoading(true);
    api.get(`/admin/catalog`).then((r) => setItems(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (it) => {
    setEditing(it);
    setForm({
      name: it.name || "",
      description: it.description || "",
      category: CATEGORIES.includes(it.category) ? it.category : "Ana Yemek",
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
      };
      if (editing) {
        await api.put(`/admin/catalog/${editing.id}`, payload);
        toast.success("Yemek havuzda güncellendi");
      } else {
        await api.post("/admin/catalog", payload);
        toast.success("Yemek havuza eklendi");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const remove = async (it) => {
    if (!window.confirm(`"${it.name}" havuzdan silinsin mi? (Günün menüsündeki mevcut kayıtlar etkilenmez)`)) return;
    try {
      await api.delete(`/admin/catalog/${it.id}`);
      toast.success("Silindi");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const filtered = items.filter(it => filterCat === "all" || it.category === filterCat);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-2">Yemek Havuzu</div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-[#2C2A29]">Hazır Yemek Şablonları</h1>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">Kategori</Label>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-40 mt-1 rounded-lg border-[#E5DFD3] h-11 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openNew} className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full h-11 px-5">
            <Plus size={16} className="mr-2" /> Havuza Ekle
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5DFD3] overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[#8A8580]">Yükleniyor…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Library className="mx-auto text-[#C05A46] mb-3" size={32} />
            <div className="font-heading text-xl font-bold">Kayıtlı yemek yok</div>
            <p className="text-[#5C5855] mt-1">Sık kullandığınız yemekleri ekleyerek günlük menü oluşturmayı hızlandırın.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#E5DFD3]">
            {filtered.map((it) => (
              <li key={it.id} className="p-4 flex items-center gap-4 hover:bg-[#F9F6F0]/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#2C2A29] truncate">{it.name}</div>
                  <div className="text-sm text-[#8A8580] truncate">{it.description || "—"}</div>
                </div>
                <span className="hidden sm:inline-block text-[10px] uppercase tracking-[0.2em] font-bold text-[#C05A46] bg-[#C05A46]/10 px-2.5 py-1 rounded-full">{it.category}</span>
                <Button variant="ghost" size="icon" onClick={() => openEdit(it)}><Pencil size={16} /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(it)} className="text-[#B93A32]"><Trash2 size={16} /></Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">{editing ? "Şablonu Düzenle" : "Yeni Şablon Ekle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="name">İsim *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 rounded-lg border-[#E5DFD3]" />
            </div>
            <div>
              <Label htmlFor="category">Kategori *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger id="category" className="mt-1 rounded-lg border-[#E5DFD3] h-11">
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="desc">Açıklama</Label>
              <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 rounded-lg border-[#E5DFD3]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-full border-[#E5DFD3]">Vazgeç</Button>
            <Button onClick={save} disabled={!form.name || !form.category} className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full">
              {editing ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
