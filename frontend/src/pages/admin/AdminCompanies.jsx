import { useEffect, useState } from "react";
import { api, formatApiErrorDetail, formatDateTR } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../../components/ui/alert-dialog";
import { toast } from "sonner";
import { Building, Pencil, Trash2, Search, User, Phone, MapPin, Mail, Calendar, Loader2 } from "lucide-react";

const emptyForm = {
  company_name: "",
  contact_name: "",
  phone: "",
  address: "",
};

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Edit dialog state
  const [openEdit, setOpenEdit] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/companies");
      setCompanies(res.data);
    } catch (err) {
      toast.error("Firmalar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleOpenEdit = (company) => {
    setEditingCompany(company);
    setForm({
      company_name: company.company_name || "",
      contact_name: company.contact_name || "",
      phone: company.phone || "",
      address: company.address || "",
    });
    setOpenEdit(true);
  };

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      toast.error("Firma adı boş olamaz");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/admin/companies/${editingCompany.id}`, form);
      toast.success("Firma bilgileri güncellendi");
      setOpenEdit(false);
      loadCompanies();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Güncelleme hatası");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = (company) => {
    setDeleteTarget(company);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/companies/${deleteTarget.id}`);
      toast.success("Firma başarıyla silindi");
      setShowDeleteDialog(false);
      loadCompanies();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Silme hatası");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredCompanies = companies.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      (c.company_name || "").toLowerCase().includes(query) ||
      (c.contact_name || "").toLowerCase().includes(query) ||
      (c.email || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-2">Firma Yönetimi</div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-[#2C2A29]">
            Kayıtlı Firmalar ({companies.length})
          </h1>
        </div>
        
        {/* Search input */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8580]" size={16} />
          <Input
            type="text"
            placeholder="Firma adı, yetkili veya e-posta ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 rounded-full border-[#E5DFD3] bg-white h-11 focus-visible:ring-[#C05A46]"
          />
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-[#8A8580] bg-white border border-[#E5DFD3] rounded-2xl">
          <Loader2 size={36} className="animate-spin text-[#C05A46] mb-4" />
          <div className="text-sm font-semibold">Firmalar yükleniyor...</div>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="p-16 text-center bg-white border border-[#E5DFD3] rounded-2xl">
          <Building className="mx-auto text-[#C05A46]/40 mb-4" size={48} />
          <h3 className="font-heading text-xl font-bold text-[#2C2A29]">Firma Bulunamadı</h3>
          <p className="text-[#5C5855] text-sm mt-1 max-w-md mx-auto">
            {searchQuery ? "Arama kriterlerinize uygun kayıt bulunamadı. Lütfen aramayı değiştirmeyi deneyin." : "Sistemde henüz kayıtlı bir firma bulunmuyor."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              className="bg-white rounded-2xl border border-[#E5DFD3] shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-[#F5F3EC] bg-[#F9F6F0]/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#C05A46]/10 flex items-center justify-center text-[#C05A46] shrink-0">
                      <Building size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading font-bold text-lg text-[#2C2A29] truncate" title={company.company_name}>
                        {company.company_name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-[#8A8580] mt-0.5">
                        <Mail size={12} className="shrink-0" />
                        <span className="truncate">{company.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-3.5 text-sm flex-1">
                {/* Contact Name */}
                <div className="flex items-start gap-3">
                  <User size={16} className="text-[#8A8580] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-[#8A8580] font-semibold uppercase tracking-wider">Yetkili Kişi</div>
                    <div className="font-medium text-[#2C2A29] truncate">{company.contact_name || "—"}</div>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3">
                  <Phone size={16} className="text-[#8A8580] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-[#8A8580] font-semibold uppercase tracking-wider">Telefon</div>
                    <div className="font-medium text-[#2C2A29]">
                      {company.phone ? (
                        <a href={`tel:${company.phone}`} className="hover:text-[#C05A46] transition-colors">{company.phone}</a>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-[#8A8580] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-[#8A8580] font-semibold uppercase tracking-wider">Adres</div>
                    <p className="text-[#5C5855] text-xs leading-relaxed line-clamp-2 mt-0.5" title={company.address}>
                      {company.address || "—"}
                    </p>
                  </div>
                </div>

                {/* Registration Date */}
                {company.created_at && (
                  <div className="flex items-start gap-3 pt-2 border-t border-[#F5F3EC]">
                    <Calendar size={14} className="text-[#8A8580] mt-0.5 shrink-0" />
                    <div className="text-[11px] text-[#8A8580]">
                      Kayıt Tarihi: <span className="font-semibold">{formatDateTR(company.created_at)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer (Actions) */}
              <div className="px-5 py-4 border-t border-[#F5F3EC] bg-[#F9F6F0]/20 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(company)}
                  className="rounded-full border-[#E5DFD3] hover:text-[#C05A46] hover:border-[#C05A46] h-9 px-4 text-xs font-semibold"
                >
                  <Pencil size={13} className="mr-1.5" /> Düzenle
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleConfirmDelete(company)}
                  className="rounded-full hover:bg-[#B93A32]/10 text-[#B93A32] hover:text-[#B93A32] h-9 px-4 text-xs font-semibold"
                >
                  <Trash2 size={13} className="mr-1.5" /> Sil
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== Düzenleme Modalı (Dialog) ===== */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-[#2C2A29]">Firma Bilgilerini Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div>
              <Label htmlFor="company_name" className="font-semibold text-[#5C5855]">Firma Adı *</Label>
              <Input
                id="company_name"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="mt-1 rounded-lg border-[#E5DFD3]"
              />
            </div>
            <div>
              <Label htmlFor="contact_name" className="font-semibold text-[#5C5855]">Yetkili Kişi</Label>
              <Input
                id="contact_name"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                className="mt-1 rounded-lg border-[#E5DFD3]"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="font-semibold text-[#5C5855]">Telefon Numarası</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 rounded-lg border-[#E5DFD3]"
              />
            </div>
            <div>
              <Label htmlFor="address" className="font-semibold text-[#5C5855]">Adres</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1 rounded-lg border-[#E5DFD3] min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setOpenEdit(false)}
              className="rounded-full border-[#E5DFD3]"
              disabled={saving}
            >
              Vazgeç
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full px-5"
              disabled={saving || !form.company_name.trim()}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" /> Kaydediliyor...
                </>
              ) : (
                "Kaydet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Silme Onay AlertDialog ===== */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-xl text-[#2C2A29]">Firmayı Silmek İstediğinize Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#5C5855]">
              <strong className="text-[#2C2A29]">"{deleteTarget?.company_name}"</strong> firması silinecektir.
              <br />
              Bu firmaya ait tüm kullanıcı bilgileri ve **geçmiş tüm sipariş kayıtları** veritabanından kalıcı olarak temizlenecektir.
              <br />
              <span className="text-[#B93A32] font-semibold mt-2 block">Bu işlem geri alınamaz!</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full border-[#E5DFD3]"
              onClick={() => { setShowDeleteDialog(false); setDeleteTarget(null); }}
              disabled={deleting}
            >
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#B93A32] hover:bg-[#9C302A] text-white rounded-full px-5"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" /> Siliniyor...
                </>
              ) : (
                "Firmayı ve Verilerini Sil"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
