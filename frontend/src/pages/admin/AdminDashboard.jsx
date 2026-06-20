import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatTimeTR } from "../../lib/api";
import { ArrowUpRight, Utensils, ListOrdered, Package, CalendarDays, Trash2, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Switch } from "../../components/ui/switch";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [todayOrders, setTodayOrders] = useState([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetMode, setResetMode] = useState("today"); // "today" | "all"
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  const handleReset = async () => {
    if (!confirmCheckbox) return;
    setResetting(true);
    try {
      const res = await api.post(`/admin/system/reset?mode=${resetMode}`);
      toast.success(res.data.message || "Veriler sıfırlandı");
      setShowResetModal(false);
      setConfirmCheckbox(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || "Sıfırlama hatası");
    } finally {
      setResetting(false);
    }
  };

  const handleMaintenanceToggle = async (checked) => {
    setTogglingMaintenance(true);
    try {
      const res = await api.post(`/admin/system/maintenance?active=${checked}`);
      setMaintenance(res.data.maintenance_mode);
      if (checked) {
        toast.warning("Sistem bakım modu aktif edildi! Admin dışındaki tüm kullanıcılar engellendi.");
      } else {
        toast.success("Sistem bakım modu pasif edildi! Tüm kullanıcılar sisteme erişebilir.");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || "Bakım modu güncellenirken hata oluştu");
    } finally {
      setTogglingMaintenance(false);
    }
  };

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    api.get("/admin/analytics/summary?days=7")
      .then((r) => setSummary(r.data))
      .catch(() => setSummary({ total_orders: 0, total_revenue: 0, daily: [], top_items: [], top_companies: [] }));
    api.get(`/admin/orders?date=${today}`)
      .then((r) => setTodayOrders(r.data))
      .catch(() => setTodayOrders([]));
    api.get("/system/maintenance")
      .then((r) => setMaintenance(r.data.maintenance_mode))
      .catch(() => setMaintenance(false));
  }, []);

  const newCount = todayOrders.filter(o => o.status === "yeni").length;
  const totalDishesToday = todayOrders
    .filter((o) => o.status !== "iptal")
    .reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-2">Genel Bakış</div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-[#2C2A29]">Bugün, mutfakta neler oluyor?</h1>
        </div>
        <Button 
          onClick={() => setShowResetModal(true)} 
          variant="outline" 
          className="rounded-full border-[#B93A32] text-[#B93A32] hover:bg-[#B93A32] hover:text-white h-10 px-5"
        >
          <Trash2 size={16} className="mr-2" /> Verileri Sıfırla
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Bugün Sipariş" value={todayOrders.length} icon={<ListOrdered size={18} />} />
        <Stat label="Yeni / Bekleyen" value={newCount} icon={<Package size={18} />} accent />
        <Stat label="Bugün Toplam Adet" value={totalDishesToday} icon={<Utensils size={18} />} />
        <Stat label="7 Günlük Sipariş" value={summary?.total_orders ?? "—"} icon={<CalendarDays size={18} />} />
      </div>

      {/* ===== Bakım Modu Yönetimi ===== */}
      <div className="bg-white rounded-2xl border border-[#E5DFD3] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${maintenance ? "bg-[#B93A32] animate-pulse" : "bg-[#4A5D23]"}`}></span>
            <h2 className="font-heading text-lg font-bold text-[#2C2A29]">Sistem Bakım Modu</h2>
          </div>
          <p className="text-sm text-[#5C5855] max-w-xl">
            Bakım modunu açtığınızda, admin dışındaki tüm firma kullanıcıları bakım ekranına yönlendirilir ve yeni sipariş vermeleri engellenir. Adminler sisteme erişmeye devam edebilir.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-[#F9F6F0] px-4 py-2.5 rounded-2xl border border-[#E5DFD3] shrink-0">
          <span className={`text-xs font-bold uppercase tracking-wider ${maintenance ? "text-[#B93A32]" : "text-[#8A8580]"}`}>
            {maintenance ? "Aktif (Sistem Kapalı)" : "Pasif (Sistem Açık)"}
          </span>
          <Switch 
            checked={maintenance} 
            onCheckedChange={handleMaintenanceToggle} 
            disabled={togglingMaintenance}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5DFD3] p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">Bugünkü Sipariş Akışı</div>
              <div className="font-heading text-2xl font-bold mt-1">Son sipariş güncellemeleri</div>
            </div>
            <Link to="/admin/orders" className="text-sm text-[#C05A46] font-semibold hover:underline flex items-center gap-1">
              Tümü <ArrowUpRight size={14} />
            </Link>
          </div>
          {todayOrders.length === 0 ? (
            <div className="mt-6 text-[#8A8580] text-sm">Bugün henüz sipariş yok.</div>
          ) : (
            <ul className="mt-5 divide-y divide-[#E5DFD3]">
              {todayOrders.slice(0, 8).map((o) => {
                const qty = o.items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <li key={o.id} className="py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#C05A46]/10 grid place-items-center font-mono font-bold text-[#C05A46] text-xs">#{o.order_no}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#2C2A29] truncate">{o.company_name}</div>
                      <div className="text-xs text-[#8A8580]">{formatTimeTR(o.created_at)} · {o.items.length} kalem</div>
                    </div>
                    <div className="text-right">
                      <div className="font-heading font-bold text-[#2C2A29]">{qty}</div>
                      <div className="text-[10px] uppercase tracking-[0.15em] text-[#8A8580]">adet</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#E5DFD3] p-6">
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">Bu Hafta En Çok</div>
          <div className="font-heading text-2xl font-bold mt-1">Tercih edilen yemekler</div>
          {summary?.top_items?.length ? (
            <ul className="mt-5 space-y-3">
              {summary.top_items.slice(0, 6).map((t, i) => (
                <li key={t.name} className="flex items-center gap-3">
                  <div className="font-mono text-xs text-[#8A8580] w-5">{i + 1}.</div>
                  <div className="flex-1 truncate text-sm font-medium">{t.name}</div>
                  <div className="text-sm font-bold text-[#C05A46]">{t.quantity}×</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 text-sm text-[#8A8580]">Henüz veri yok.</div>
          )}
        </div>
      </div>

      {/* ===== Veri Sıfırlama Modalı ===== */}
      <Dialog open={showResetModal} onOpenChange={(v) => { setShowResetModal(v); if(!v) setConfirmCheckbox(false); }}>
        <DialogContent className="max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-[#2C2A29]">Sistem Verilerini Sıfırla</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-3 text-sm text-[#5C5855]">
            <p>
              Hangi verileri sıfırlamak istediğinizi seçin. Yemek havuzu kataloğu ve kayıtlı firmalar bu işlemden etkilenmeyecektir.
            </p>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-[#E5DFD3] bg-[#F9F6F0]/40 hover:bg-[#F9F6F0]/85 cursor-pointer">
                <input
                  type="radio"
                  name="resetMode"
                  checked={resetMode === "today"}
                  onChange={() => setResetMode("today")}
                  className="mt-1 text-[#C05A46] focus:ring-[#C05A46]"
                />
                <div>
                  <div className="font-semibold text-[#2C2A29]">Bugünkü Verileri Sıfırla</div>
                  <div className="text-xs text-[#8A8580] mt-0.5">Sadece bugünün menü yemeklerini ve bugünkü siparişleri veritabanından kalıcı olarak siler.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-[#E5DFD3] bg-[#F9F6F0]/40 hover:bg-[#F9F6F0]/85 cursor-pointer">
                <input
                  type="radio"
                  name="resetMode"
                  checked={resetMode === "all"}
                  onChange={() => setResetMode("all")}
                  className="mt-1 text-[#C05A46] focus:ring-[#C05A46]"
                />
                <div>
                  <div className="font-semibold text-[#2C2A29]">Tüm Geçmişi ve Bugünü Sıfırla</div>
                  <div className="text-xs text-[#8A8580] mt-0.5">Tüm günlerin menülerini ve tüm sipariş geçmişini veritabanından kalıcı olarak temizler.</div>
                </div>
              </label>
            </div>

            <div className="p-3 bg-[#B93A32]/10 border border-[#B93A32]/20 rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmCheckbox}
                  onChange={(e) => setConfirmCheckbox(e.target.checked)}
                  className="mt-1 rounded border-[#E5DFD3] text-[#B93A32] focus:ring-[#B93A32]"
                />
                <span className="text-xs font-semibold text-[#B93A32]">
                  Bu işlemin geri alınamaz olduğunu ve seçilen tüm menü/sipariş kayıtlarını kalıcı olarak sileceğini onaylıyorum.
                </span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { setShowResetModal(false); setConfirmCheckbox(false); }} 
              className="rounded-full border-[#E5DFD3]"
            >
              Vazgeç
            </Button>
            <Button 
              onClick={handleReset} 
              disabled={!confirmCheckbox || resetting} 
              className="bg-[#B93A32] hover:bg-[#9C302A] text-white rounded-full px-5"
            >
              {resetting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" /> Sıfırlanıyor...
                </>
              ) : (
                "Verileri Kalıcı Olarak Sil"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, icon, accent }) {
  return (
    <div className={`rounded-2xl p-5 border ${accent ? "bg-[#C05A46] border-[#C05A46] text-white" : "bg-white border-[#E5DFD3]"}`}>
      <div className={`flex items-center justify-between text-xs uppercase tracking-[0.2em] font-bold ${accent ? "text-white/80" : "text-[#8A8580]"}`}>
        <span>{label}</span>{icon}
      </div>
      <div className={`font-heading text-3xl font-bold mt-3 ${accent ? "text-white" : "text-[#2C2A29]"}`}>{value}</div>
    </div>
  );
}
