import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatTRY, formatTimeTR } from "../../lib/api";
import { ArrowUpRight, Utensils, ListOrdered, BarChart3, Package } from "lucide-react";

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [todayOrders, setTodayOrders] = useState([]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    api.get("/admin/analytics/summary?days=7")
      .then((r) => setSummary(r.data))
      .catch(() => setSummary({ total_orders: 0, total_revenue: 0, daily: [], top_items: [], top_companies: [] }));
    api.get(`/admin/orders?date=${today}`)
      .then((r) => setTodayOrders(r.data))
      .catch(() => setTodayOrders([]));
  }, []);

  const todayRevenue = todayOrders.filter(o => o.status !== "iptal").reduce((s, o) => s + o.total, 0);
  const newCount = todayOrders.filter(o => o.status === "yeni").length;

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-2">Genel Bakış</div>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-[#2C2A29]">Bugün, mutfakta neler oluyor?</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Bugün Sipariş" value={todayOrders.length} icon={<ListOrdered size={18} />} />
        <Stat label="Yeni / Bekleyen" value={newCount} icon={<Package size={18} />} accent />
        <Stat label="Bugün Ciro" value={formatTRY(todayRevenue)} icon={<BarChart3 size={18} />} />
        <Stat label="7 Günlük Sipariş" value={summary?.total_orders ?? "—"} icon={<Utensils size={18} />} />
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
              {todayOrders.slice(0, 8).map((o) => (
                <li key={o.id} className="py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#C05A46]/10 grid place-items-center font-mono font-bold text-[#C05A46] text-xs">#{o.order_no}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#2C2A29] truncate">{o.company_name}</div>
                    <div className="text-xs text-[#8A8580]">{formatTimeTR(o.created_at)} · {o.items.length} kalem</div>
                  </div>
                  <div className="font-heading font-bold text-[#2C2A29]">{formatTRY(o.total)}</div>
                </li>
              ))}
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
