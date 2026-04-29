import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, formatTRY, formatDateTR, formatTimeTR } from "../lib/api";
import { Button } from "../components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

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

        <div style={{ fontWeight: "bold", fontSize: 12 }}>{order.company_name}</div>
        {order.contact_name && <div style={{ fontSize: 11 }}>{order.contact_name}</div>}
        {order.phone && <div style={{ fontSize: 11 }}>Tel: {order.phone}</div>}
        {order.address && <div style={{ fontSize: 11 }}>{order.address}</div>}

        <div style={{ borderTop: "1px dashed black", margin: "6px 0" }} />

        <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid black" }}>
              <th style={{ textAlign: "left", padding: "2px 0" }}>Yemek</th>
              <th style={{ textAlign: "center", padding: "2px 0" }}>Adet</th>
              <th style={{ textAlign: "right", padding: "2px 0" }}>Tutar</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={i}>
                <td style={{ padding: "3px 0" }}>{it.name}</td>
                <td style={{ textAlign: "center" }}>{it.quantity}</td>
                <td style={{ textAlign: "right" }}>{formatTRY(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: "1px dashed black", margin: "6px 0" }} />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: "bold" }}>
          <span>TOPLAM</span><span>{formatTRY(order.total)}</span>
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
