import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, formatDateTR, formatTimeTR, CATEGORY_ORDER, categoryRank } from "../lib/api";
import { Button } from "../components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

function groupByCategory(items) {
  const groups = CATEGORY_ORDER
    .map((cat) => ({ cat, items: items.filter((i) => (i.category || "Ana Yemek") === cat) }))
    .filter((g) => g.items.length > 0);
  const others = items.filter((i) => categoryRank(i.category || "Ana Yemek") === 999);
  if (others.length) groups.push({ cat: "Diğer", items: others });
  return groups;
}

export default function PrintReceipt() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/${orderId}`)
      .then((r) => setOrder(r.data))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <div className="min-h-screen grid place-items-center text-[#8A8580]">Yükleniyor…</div>;
  if (!order) return <div className="min-h-screen grid place-items-center text-[#B93A32]">Sipariş bulunamadı</div>;

  const groups = groupByCategory(order.items);
  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen bg-[#F2EBE3] flex flex-col items-center py-8 px-4">
      <div className="no-print w-full max-w-sm flex items-center justify-between mb-5">
        <Link to="/admin/orders" data-testid="print-back-button">
          <Button variant="ghost" className="rounded-full"><ArrowLeft size={16} className="mr-1" /> Geri</Button>
        </Link>
        <Button onClick={() => window.print()} className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full" data-testid="print-button">
          <Printer size={16} className="mr-2" /> Yazdır
        </Button>
      </div>

      <div className="thermal-receipt shadow-lg" data-testid="thermal-receipt">
        <div style={{ textAlign: "center", borderBottom: "1px dashed black", paddingBottom: 6, marginBottom: 6 }}>
          <div style={{ fontWeight: "bold", fontSize: 14, letterSpacing: "0.05em" }}>DOYURAN GÜVEÇ LOKANTASI</div>
          <div style={{ fontSize: 10 }}>Günlük Taze · Öğle Paketi</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
          <span>Sipariş No:</span><span style={{ fontWeight: "bold" }}>#{order.order_no}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
          <span>Tarih:</span><span>{formatDateTR(order.created_at)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
          <span>Saat:</span><span>{formatTimeTR(order.created_at)}</span>
        </div>

        <div style={{ borderTop: "1px dashed black", margin: "6px 0" }} />

        <div style={{ fontWeight: "bold", fontSize: 13 }}>{order.company_name}</div>
        {order.contact_name && <div style={{ fontSize: 11 }}>{order.contact_name}</div>}
        {order.phone && <div style={{ fontSize: 11 }}>Tel: {order.phone}</div>}
        {order.address && <div style={{ fontSize: 11 }}>{order.address}</div>}

        <div style={{ borderTop: "1px dashed black", margin: "6px 0" }} />

        {groups.map(({ cat, items }) => (
          <div key={cat} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid black", paddingBottom: 2, marginBottom: 2 }}>
              {cat}
            </div>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td style={{ padding: "2px 0" }}>{it.name}</td>
                    <td style={{ textAlign: "right", padding: "2px 0", fontWeight: "bold", whiteSpace: "nowrap" }}>× {it.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div style={{ borderTop: "1px dashed black", margin: "6px 0" }} />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: "bold" }}>
          <span>TOPLAM ADET</span><span>{totalQty}</span>
        </div>

        {order.note && (
          <>
            <div style={{ borderTop: "1px dashed black", margin: "6px 0" }} />
            <div style={{ fontSize: 11, fontWeight: "bold" }}>NOT:</div>
            <div style={{ fontSize: 11 }}>{order.note}</div>
          </>
        )}

        <div style={{ borderTop: "1px dashed black", margin: "6px 0" }} />
        <div style={{ textAlign: "center", fontSize: 10, marginTop: 4 }}>
          Afiyet olsun!
        </div>
        <div style={{ textAlign: "center", fontSize: 9, marginTop: 6, opacity: 0.7 }}>
          doyuranguvec.com
        </div>
      </div>
    </div>
  );
}
