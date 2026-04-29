import { useEffect, useState } from "react";
import { api, formatTRY } from "../../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";

export default function AdminAnalytics() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/admin/analytics/summary?days=${days}`).then((r) => setData(r.data));
  }, [days]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-2">Analitik</div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-[#2C2A29]">Hangi yemek, hangi firma?</h1>
        </div>
        <div className="flex gap-2 bg-white rounded-full border border-[#E5DFD3] p-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${days === d ? "bg-[#C05A46] text-white" : "text-[#5C5855] hover:text-[#C05A46]"}`}
              data-testid={`analytics-range-${d}`}
            >
              Son {d} gün
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Toplam Sipariş" value={data?.total_orders ?? "—"} />
        <Stat label="Toplam Ciro" value={data ? formatTRY(data.total_revenue) : "—"} />
        <Stat label="Ortalama Sipariş" value={data && data.total_orders ? formatTRY(data.total_revenue / data.total_orders) : "—"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-[#E5DFD3] p-6">
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">Günlük Ciro Trendi</div>
          <div className="font-heading text-2xl font-bold mt-1 mb-5">Son {days} gün</div>
          <div style={{ width: "100%", height: 256 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <LineChart data={data?.daily ?? []}>
                <CartesianGrid stroke="#E5DFD3" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#8A8580" fontSize={11} />
                <YAxis stroke="#8A8580" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid #E5DFD3", borderRadius: 12 }}
                  formatter={(v) => formatTRY(v)}
                />
                <Line type="monotone" dataKey="revenue" stroke="#C05A46" strokeWidth={2.5} dot={{ fill: "#C05A46", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5DFD3] p-6">
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">En Çok Sipariş Edilen Yemekler</div>
          <div className="font-heading text-2xl font-bold mt-1 mb-5">İlk 10</div>
          <div style={{ width: "100%", height: 256 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <BarChart data={data?.top_items ?? []} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid stroke="#E5DFD3" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="#8A8580" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="#8A8580" fontSize={11} width={100} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #E5DFD3", borderRadius: 12 }} />
                <Bar dataKey="quantity" fill="#C05A46" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5DFD3] p-6">
        <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">En Çok Sipariş Veren Firmalar</div>
        <div className="font-heading text-2xl font-bold mt-1">İlk 10</div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.15em] text-[#8A8580] border-b border-[#E5DFD3]">
                <th className="py-2.5 font-bold">#</th>
                <th className="py-2.5 font-bold">Firma</th>
                <th className="py-2.5 font-bold text-right">Sipariş</th>
                <th className="py-2.5 font-bold text-right">Ciro</th>
              </tr>
            </thead>
            <tbody>
              {(data?.top_companies ?? []).map((c, i) => (
                <tr key={c.name} className="border-b border-dashed border-[#E5DFD3]">
                  <td className="py-3 font-mono text-[#8A8580]">{i + 1}</td>
                  <td className="py-3 font-semibold">{c.name}</td>
                  <td className="py-3 text-right">{c.orders}</td>
                  <td className="py-3 text-right font-bold text-[#C05A46]">{formatTRY(c.revenue)}</td>
                </tr>
              ))}
              {!data?.top_companies?.length && (
                <tr><td colSpan={4} className="py-6 text-center text-[#8A8580]">Henüz veri yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5DFD3] p-5">
      <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580]">{label}</div>
      <div className="font-heading text-3xl font-bold mt-2 text-[#2C2A29]">{value}</div>
    </div>
  );
}
