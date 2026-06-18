import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api, groupByCategory, STATUS_LABELS } from "../lib/api";
import NavBar from "../components/NavBar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import EditOrderDialog from "../components/EditOrderDialog";
import { Printer, ChevronDown, ChevronUp, Clock, Pencil, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../lib/language";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 10;
  const { t, language } = useLanguage();

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/orders/me?page=${page}&limit=${limit}`)
      .then((r) => setOrders(r.data))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const loc = language === "tr" ? "tr-TR" : language === "az" ? "az-AZ" : "ar-SY";
    return d.toLocaleDateString(loc, { day: "2-digit", month: "long", year: "numeric" });
  };

  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const loc = language === "tr" ? "tr-TR" : language === "az" ? "az-AZ" : "ar-SY";
    return d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0]">
      <NavBar />
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-10">
        <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-[#2C2A29]">{t("orders_title")}</h1>
        <p className="text-[#5C5855] mt-2">{t("orders_desc")}</p>

        {loading && orders.length === 0 ? (
          <div className="mt-10 text-[#8A8580]">{t("orders_loading")}</div>
        ) : orders.length === 0 && page === 1 ? (
          <div className="mt-10 rounded-3xl bg-white border border-[#E5DFD3] p-12 text-center">
            <Clock className="mx-auto text-[#C05A46] mb-3" size={32} />
            <div className="font-heading text-2xl font-bold">{t("orders_no_orders")}</div>
            <Link to="/menu" className="inline-block mt-4 text-[#C05A46] font-semibold hover:underline">{t("orders_view_today")}</Link>
          </div>
        ) : (
          <>
            {orders.length === 0 ? (
              <div className="mt-10 bg-white rounded-2xl border border-[#E5DFD3] p-10 text-center text-[#8A8580]">
                {t("orders_not_found")}
              </div>
            ) : (
              <ul className="mt-8 space-y-3">
                {orders.map((o) => {
                  const isOpen = expanded === o.id;
                  const st = STATUS_LABELS[o.status] || STATUS_LABELS.yeni;
                  const totalQty = o.items.reduce((s, i) => s + i.quantity, 0);
                  return (
                    <li key={o.id} className="bg-white rounded-2xl border border-[#E5DFD3] overflow-hidden" data-testid={`order-row-${o.id}`}>
                      <button onClick={() => setExpanded(isOpen ? null : o.id)} className="w-full flex items-center gap-4 p-5 text-left rtl:text-right hover:bg-[#F9F6F0]/60 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-[#C05A46]/10 grid place-items-center font-mono font-bold text-[#C05A46] shrink-0">
                          #{o.order_no}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#2C2A29] flex items-center gap-2 flex-wrap">
                            {formatDate(o.created_at)} · {formatTime(o.created_at)}
                            {o.meal_time && o.meal_time !== "Öğle" && (
                              <span className="inline-flex items-center gap-1 bg-[#2C2A29] text-white text-[10px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-full">
                                {t("orders_evening_meal")}
                              </span>
                            )}
                            {o.is_revised && (
                              <span className="inline-flex items-center gap-1 bg-[#E8AA42]/15 text-[#9F7012] text-[10px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-full border border-[#E8AA42]/30">
                                <AlertTriangle size={10} /> {t("orders_revised", { count: o.revision_count })}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-[#8A8580]">
                            {t("orders_items_count", { items: o.items.length, qty: totalQty })}
                          </div>
                        </div>
                        <Badge className={`border ${st.cls} rounded-full px-3 py-1 font-semibold`}>
                          {t("status_" + o.status)}
                        </Badge>
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      {isOpen && (
                        <div className="border-t border-[#E5DFD3] p-5 bg-[#F9F6F0]/40">
                          <div className="grid sm:grid-cols-2 gap-6">
                            <div>
                              <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580] mb-2">{t("orders_detail")}</div>
                              <CategorizedItemList items={o.items} />
                            </div>
                            <div>
                              {o.note && (
                                <>
                                  <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#8A8580] mb-2">{t("orders_note")}</div>
                                  <div className="text-sm text-[#2C2A29] mb-4">{o.note}</div>
                                </>
                              )}
                              {o.meal_time && o.meal_time !== "Öğle" && (
                                <div className="bg-[#2C2A29] rounded-lg px-3 py-2 text-sm text-white mb-4">
                                  {t("orders_evening_meal_detail", { time: o.meal_time })}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-3">
                                <Link to={`/print/${o.id}`} className="inline-flex items-center gap-2 text-sm text-[#C05A46] font-semibold hover:underline" data-testid={`order-print-${o.id}`}>
                                  <Printer size={14} /> {t("orders_print")}
                                </Link>
                                {o.status === "yeni" && (
                                  <Button
                                    onClick={(e) => { e.stopPropagation(); setEditingOrder(o); }}
                                    size="sm"
                                    className="bg-[#2C2A29] hover:bg-[#1a1918] text-white rounded-full h-8"
                                    data-testid={`order-edit-${o.id}`}
                                  >
                                    <Pencil size={12} className="mr-1.5" /> {t("orders_edit")}
                                  </Button>
                                )}
                              </div>
                              {o.status !== "yeni" && (
                                <div className="mt-3 text-xs text-[#8A8580]">
                                  {t("orders_cant_edit")}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Sayfalama Kontrolleri */}
            <div className="flex items-center justify-between mt-8 border-t border-[#E5DFD3] pt-6">
              <div className="text-sm text-[#8A8580]">
                {t("orders_page", { page: page })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="rounded-full border-[#E5DFD3] h-10 px-4 hover:bg-[#F9F6F0]"
                  data-testid="orders-prev-page"
                >
                  <ChevronLeft size={16} className="mr-1 rtl:rotate-180" /> {t("orders_prev")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={orders.length < limit || loading}
                  className="rounded-full border-[#E5DFD3] h-10 px-4 hover:bg-[#F9F6F0]"
                  data-testid="orders-next-page"
                >
                  {t("orders_next")} <ChevronRight size={16} className="ml-1 rtl:rotate-180" />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>

      <EditOrderDialog
        open={!!editingOrder}
        onOpenChange={(v) => !v && setEditingOrder(null)}
        order={editingOrder}
        onSaved={load}
      />
    </div>
  );
}

function CategorizedItemList({ items }) {
  const groups = groupByCategory(items);
  const { t } = useLanguage();

  const getCategoryTranslation = (cat) => {
    if (cat.toLowerCase().includes("çorba")) return t("cat_soup");
    if (cat.toLowerCase().includes("ana yemek")) return t("cat_main");
    if (cat.toLowerCase().includes("yan yemek") || cat.toLowerCase().includes("yan lezzet")) return t("cat_side");
    if (cat.toLowerCase().includes("i̇çecek") || cat.toLowerCase().includes("icecek")) return t("cat_drink");
    if (cat.toLowerCase().includes("tatlı") || cat.toLowerCase().includes("tatli")) return t("cat_dessert");
    return cat;
  };

  return (
    <div className="space-y-3">
      {groups.map(({ cat, items: catItems }) => (
        <div key={cat}>
          <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-1.5">{getCategoryTranslation(cat)}</div>
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
