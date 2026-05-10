import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api, formatTimeTR, formatApiErrorDetail, groupByCategory, todayISO, STATUS_LABELS } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Printer, RefreshCw, ChefHat, Check, X, Clock, AlertTriangle, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function AdminOrders() {
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryPrinting, setSummaryPrinting] = useState(false);

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

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get(`/admin/daily-summary?date=${date}`);
      setSummary(res.data);
      setSummaryOpen(true);
    } catch (err) {
      toast.error("Özet yüklenemedi");
    } finally {
      setSummaryLoading(false);
    }
  };

  const printSummary = async () => {
    setSummaryPrinting(true);
    try {
      await api.post(`/admin/daily-summary/print?date=${date}`);
      toast.success("Özet fişi yazıcıya gönderildi");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Yazdırma hatası");
    } finally {
      setSummaryPrinting(false);
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
          <Button onClick={loadSummary} disabled={summaryLoading} className="rounded-full bg-[#2C2A29] hover:bg-[#1a1918] text-white h-11" data-testid="admin-daily-summary">
            <BarChart3 size={14} className="mr-2" /> {summaryLoading ? "Yükleniyor…" : "Gün Özeti"}
          </Button>
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
              <div key={o.id} className={`rounded-2xl border p-5 ${o.is_revised ? "bg-[#E8AA42]/10 border-[#E8AA42]/50 ring-2 ring-[#E8AA42]/30" : "bg-white border-[#E5DFD3]"}`} data-testid={`admin-order-${o.id}`}>
                {o.is_revised && (
                  <div className="flex items-center gap-2 bg-[#2C2A29] text-white text-xs uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded-full mb-3 w-fit" data-testid={`admin-order-revised-${o.id}`}>
                    <AlertTriangle size={12} /> Düzeltildi ×{o.revision_count || 1} — Fişi yeniden yazdırın
                  </div>
                )}
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
                      {o.meal_time && o.meal_time !== "Öğle" && (
                        <span className="inline-flex items-center gap-1 ml-2 bg-[#2C2A29] text-white text-[10px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-full">
                          🌙 Akşam Yemeği Var
                        </span>
                      )}
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

                {o.meal_time && o.meal_time !== "Öğle" && (
                  <div className="mt-3 bg-[#2C2A29] rounded-lg px-3 py-2 text-sm text-white">
                    <span className="font-bold">🌙 Akşam Yemeği İsteği:</span> {o.meal_time}
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

      {/* Gün Özeti Paneli */}
      {summaryOpen && summary && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSummaryOpen(false)}>
          <div className="bg-white rounded-2xl border border-[#E5DFD3] max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5DFD3] flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#C05A46]">Gün Özeti</div>
                <div className="font-heading text-xl font-bold text-[#2C2A29] mt-1">{summary.date}</div>
              </div>
              <button onClick={() => setSummaryOpen(false)} className="w-8 h-8 rounded-full bg-[#F2EBE3] grid place-items-center hover:bg-[#E5DFD3]">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {summary.companies.length === 0 ? (
                <div className="text-center text-[#8A8580] py-8">Bu tarihte sipariş yok.</div>
              ) : (
                <div className="space-y-3">
                  {summary.companies.map((c) => (
                    <div key={c.company} className="bg-[#F9F6F0] rounded-xl border border-[#E5DFD3] p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-heading text-lg font-bold text-[#2C2A29]">{c.company}</div>
                        <div className="font-heading text-2xl font-bold text-[#C05A46]">{c.total}</div>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm text-[#5C5855]">
                        <span>🍽️ Öğle: <strong>{c.lunch_qty}</strong></span>
                        {c.dinner_qty > 0 && <span>🌙 Akşam: <strong>{c.dinner_qty}</strong></span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#E5DFD3] bg-[#2C2A29] rounded-b-2xl">
              <div className="flex items-center justify-between text-white">
                <div className="text-sm font-bold uppercase tracking-[0.15em]">Genel Toplam</div>
                <div className="font-heading text-3xl font-bold">{summary.grand_total.total}</div>
              </div>
              <div className="flex gap-4 mt-1 text-sm text-[#8A8580]">
                <span>🍽️ Öğle: {summary.grand_total.lunch}</span>
                {summary.grand_total.dinner > 0 && <span>🌙 Akşam: {summary.grand_total.dinner}</span>}
              </div>
              <Button
                onClick={printSummary}
                disabled={summaryPrinting}
                className="mt-3 w-full bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full h-10"
              >
                <Printer size={14} className="mr-2" /> {summaryPrinting ? "Yazdırılıyor…" : "Özet Fişini Yazdır"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategorizedAdminItems({ items }) {
  const groups = groupByCategory(items);
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
