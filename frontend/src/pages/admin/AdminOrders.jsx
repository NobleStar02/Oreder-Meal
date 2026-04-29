import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api, formatTimeTR, formatApiErrorDetail, CATEGORY_ORDER, categoryRank } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Printer, RefreshCw, ChefHat, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";

const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUS_LABELS = {
  yeni: { label: "Yeni", cls: "bg-[#E8AA42]/15 text-[#9F7012] border-[#E8AA42]/30", icon: <Clock size={12} /> },
  hazirlaniyor: { label: "Hazırlanıyor", cls: "bg-[#4A7C9D]/15 text-[#2F587A] border-[#4A7C9D]/30", icon: <ChefHat size={12} /> },
  tamamlandi: { label: "Tamamlandı", cls: "bg-[#4A5D23]/15 text-[#3A4A1A] border-[#4A5D23]/30", icon: <Check size={12} /> },
  iptal: { label: "İptal", cls: "bg-[#B93A32]/15 text-[#7A2520] border-[#B93A32]/30", icon: <X size={12} /> },
};

export default function AdminOrders() {
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (status !== "all") params.set("status", status);
    api.get(`/admin/orders?${params}`).then((r) => setOrders(r.data)).finally(() => setLoading(false));
  }, [date, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, 15000); // auto-refresh every 15s
    return () => clearInterval(id);
  }, [load]);

  const updateStatus = async (id, s) => {
    try {
      await api.put(`/admin/orders/${id}/status?status=${s}`);
      toast.success("Durum güncellendi");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-2">Siparişler</div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-[#2C2A29]">Bugünün sipariş akışı</h1>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">Tarih</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 rounded-lg border-[#E5DFD3] h-11 bg-white" data-testid="admin-orders-date-filter" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">Durum</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44 mt-1 rounded-lg border-[#E5DFD3] h-11 bg-white" data-testid="admin-orders-status-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="yeni">Yeni</SelectItem>
                <SelectItem value="hazirlaniyor">Hazırlanıyor</SelectItem>
                <SelectItem value="tamamlandi">Tamamlandı</SelectItem>
                <SelectItem value="iptal">İptal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={load} variant="outline" className="rounded-full border-[#E5DFD3] h-11" data-testid="admin-orders-refresh"><RefreshCw size={14} className="mr-2" /> Yenile</Button>
        </div>
      </div>

      <div className="space-y-3">
        {loading && orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5DFD3] p-10 text-center text-[#8A8580]">Yükleniyor…</div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5DFD3] p-10 text-center text-[#8A8580]">Bu kriterlere uygun sipariş yok.</div>
        ) : (
          orders.map((o) => {
            const st = STATUS_LABELS[o.status] || STATUS_LABELS.yeni;
            return (
              <div key={o.id} className="bg-white rounded-2xl border border-[#E5DFD3] p-5" data-testid={`admin-order-${o.id}`}>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#C05A46]/10 grid place-items-center font-mono font-bold text-[#C05A46]">
                    #{o.order_no}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading text-lg font-bold text-[#2C2A29]">{o.company_name}</span>
                      <Badge className={`border ${st.cls} rounded-full px-2.5 py-0.5 font-semibold gap-1`}>{st.icon}{st.label}</Badge>
                    </div>
                    <div className="text-sm text-[#8A8580]">
                      {formatTimeTR(o.created_at)}
                      {o.contact_name && <> · {o.contact_name}</>}
                      {o.phone && <> · {o.phone}</>}
                    </div>
                    {o.address && <div className="text-xs text-[#8A8580] mt-0.5">{o.address}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-heading text-2xl font-bold text-[#2C2A29]">{o.items.reduce((s, i) => s + i.quantity, 0)}</div>
                    <div className="text-xs text-[#8A8580] uppercase tracking-[0.15em]">adet</div>
                  </div>
                </div>

                <div className="mt-4">
                  <CategorizedAdminItems items={o.items} />
                </div>

                {o.note && (
                  <div className="mt-3 bg-[#F2EBE3] rounded-lg px-3 py-2 text-sm text-[#2C2A29]">
                    <span className="font-bold">Not:</span> {o.note}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/print/${o.id}`} target="_blank" data-testid={`admin-order-print-${o.id}`}>
                    <Button className="bg-[#2C2A29] hover:bg-[#1a1918] text-white rounded-full"><Printer size={14} className="mr-2" /> Termal Yazdır</Button>
                  </Link>
                  {o.status === "yeni" && (
                    <Button variant="outline" onClick={() => updateStatus(o.id, "hazirlaniyor")} className="rounded-full border-[#E5DFD3]" data-testid={`admin-order-prepare-${o.id}`}>
                      <ChefHat size={14} className="mr-2" /> Hazırlamaya Başla
                    </Button>
                  )}
                  {o.status === "hazirlaniyor" && (
                    <Button variant="outline" onClick={() => updateStatus(o.id, "tamamlandi")} className="rounded-full border-[#E5DFD3]" data-testid={`admin-order-complete-${o.id}`}>
                      <Check size={14} className="mr-2" /> Tamamlandı
                    </Button>
                  )}
                  {o.status !== "iptal" && o.status !== "tamamlandi" && (
                    <Button variant="ghost" onClick={() => updateStatus(o.id, "iptal")} className="text-[#B93A32] rounded-full hover:bg-[#B93A32]/10" data-testid={`admin-order-cancel-${o.id}`}>
                      <X size={14} className="mr-2" /> İptal Et
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function CategorizedAdminItems({ items }) {
  const groups = CATEGORY_ORDER
    .map((cat) => ({ cat, items: items.filter((i) => (i.category || "Ana Yemek") === cat) }))
    .filter((g) => g.items.length > 0);
  const others = items.filter((i) => categoryRank(i.category || "Ana Yemek") === 999);
  if (others.length) groups.push({ cat: "Diğer", items: others });
  return (
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
      {groups.map(({ cat, items: catItems }) => (
        <div key={cat}>
          <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-1.5">{cat}</div>
          <ul>
            {catItems.map((it, i) => (
              <li key={i} className="flex justify-between text-sm border-b border-dashed border-[#E5DFD3] py-1.5">
                <span>{it.name}</span>
                <span className="font-bold text-[#2C2A29]">× {it.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
