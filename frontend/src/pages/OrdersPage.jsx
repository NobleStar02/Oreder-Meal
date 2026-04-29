import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatDateTR, formatTimeTR, CATEGORY_ORDER, categoryRank } from "../lib/api";
import NavBar from "../components/NavBar";
import { Badge } from "../components/ui/badge";
import { Printer, ChevronDown, ChevronUp, Clock } from "lucide-react";

const STATUS_LABELS = {
  yeni: { label: "Yeni", cls: "bg-[#E8AA42]/15 text-[#9F7012] border-[#E8AA42]/30" },
  hazirlaniyor: { label: "Hazırlanıyor", cls: "bg-[#4A7C9D]/15 text-[#2F587A] border-[#4A7C9D]/30" },
  tamamlandi: { label: "Tamamlandı", cls: "bg-[#4A5D23]/15 text-[#3A4A1A] border-[#4A5D23]/30" },
  iptal: { label: "İptal", cls: "bg-[#B93A32]/15 text-[#7A2520] border-[#B93A32]/30" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/orders/me").then((r) => setOrders(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F9F6F0]">
      <NavBar />
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-10">
        <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-[#2C2A29]">Siparişlerim</h1>
        <p className="text-[#5C5855] mt-2">Geçmiş siparişlerinizi ve durumlarını buradan takip edin.</p>

        {loading ? (
          <div className="mt-10 text-[#8A8580]">Yükleniyor…</div>
        ) : orders.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-white border border-[#E5DFD3] p-12 text-center">
            <Clock className="mx-auto text-[#C05A46] mb-3" size={32} />
            <div className="font-heading text-2xl font-bold">Henüz sipariş vermediniz</div>
            <Link to="/menu" className="inline-block mt-4 text-[#C05A46] font-semibold hover:underline">Bugünün menüsüne göz atın →</Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {orders.map((o) => {
              const isOpen = expanded === o.id;
              const st = STATUS_LABELS[o.status] || STATUS_LABELS.yeni;
              return (
                <li key={o.id} className="bg-white rounded-2xl border border-[#E5DFD3] overflow-hidden" data-testid={`order-row-${o.id}`}>
                  <button onClick={() => setExpanded(isOpen ? null : o.id)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-[#F9F6F0]/60 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-[#C05A46]/10 grid place-items-center font-mono font-bold text-[#C05A46]">
                      #{o.order_no}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#2C2A29]">{formatDateTR(o.created_at)} · {formatTimeTR(o.created_at)}</div>
                      <div className="text-sm text-[#8A8580]">{o.items.length} kalem · {o.items.reduce((s, i) => s + i.quantity, 0)} adet</div>
                    </div>
                    <Badge className={`border ${st.cls} rounded-full px-3 py-1 font-semibold`}>{st.label}</Badge>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {isOpen && (
                    <div className="border-t border-[#E5DFD3] p-5 bg-[#F9F6F0]/40">
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580] mb-2">Sipariş Detayı</div>
                          <CategorizedItemList items={o.items} />
                        </div>
                        <div>
                          {o.note && (
                            <>
                              <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580] mb-2">Not</div>
                              <div className="text-sm text-[#2C2A29] mb-4">{o.note}</div>
                            </>
                          )}
                          <Link to={`/print/${o.id}`} className="inline-flex items-center gap-2 text-sm text-[#C05A46] font-semibold hover:underline" data-testid={`order-print-${o.id}`}>
                            <Printer size={14} /> Fişi yazdır / görüntüle
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function CategorizedItemList({ items }) {
  const groups = CATEGORY_ORDER
    .map((cat) => ({ cat, items: items.filter((i) => (i.category || "Ana Yemek") === cat) }))
    .filter((g) => g.items.length > 0);
  const others = items.filter((i) => categoryRank(i.category || "Ana Yemek") === 999);
  if (others.length) groups.push({ cat: "Diğer", items: others });
  return (
    <div className="space-y-3">
      {groups.map(({ cat, items: catItems }) => (
        <div key={cat}>
          <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-1.5">{cat}</div>
          <ul className="space-y-1">
            {catItems.map((it, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span>{it.name}</span>
                <span className="text-[#8A8580]">× {it.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
