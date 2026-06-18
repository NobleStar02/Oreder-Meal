import axios from "axios";

// Telefondan erişimde localhost yerine bilgisayarın IP'sini kullan
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const currentHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
const resolvedBackend = currentHost !== "localhost" && currentHost !== "127.0.0.1"
  ? BACKEND_URL.replace("localhost", currentHost)
  : BACKEND_URL;
export const API = `${resolvedBackend}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== "/auth/login" &&
      originalRequest.url !== "/auth/refresh"
    ) {
      originalRequest._retry = true;
      try {
        await api.post("/auth/refresh");
        return api(originalRequest);
      } catch (refreshError) {
        if (typeof window !== "undefined") {
          const path = window.location.pathname;
          if (path !== "/login" && path !== "/register" && path !== "/") {
            window.location.href = "/login";
          }
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Bir hata oluştu. Lütfen tekrar deneyin.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function formatTRY(amount) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatDateTR(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatTimeTR(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export const CATEGORY_ORDER = ["Çorba", "Çorbalar", "Ana Yemek", "Yan Yemek", "Yan Lezzetler", "İçecek", "İçecekler", "Tatlı", "Tatlılar"];

export function categoryRank(cat) {
  if (!cat) return 999;
  for (let i = 0; i < CATEGORY_ORDER.length; i++) {
    if (cat.toLowerCase().includes(CATEGORY_ORDER[i].toLowerCase())) return i;
  }
  return 999;
}

export function sortByCategory(arr) {
  return [...arr].sort((a, b) => {
    const ra = categoryRank(a.category);
    const rb = categoryRank(b.category);
    if (ra !== rb) return ra - rb;
    return (a.name || "").localeCompare(b.name || "", "tr");
  });
}

/**
 * Groups items by their category, following CATEGORY_ORDER.
 * Items not matching any known category go into "Diğer".
 */
export function groupByCategory(items) {
  const groups = CATEGORY_ORDER
    .map((cat) => ({ cat, items: items.filter((i) => (i.category || "Ana Yemek") === cat) }))
    .filter((g) => g.items.length > 0);
  const others = items.filter((i) => categoryRank(i.category || "Ana Yemek") === 999);
  if (others.length) groups.push({ cat: "Diğer", items: others });
  return groups;
}

/** Returns today's date as ISO string (YYYY-MM-DD) adjusted to Turkey time zone (UTC+3) */
export function todayISO() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const turkeyTime = new Date(utc + 3600000 * 3);
  return turkeyTime.toISOString().slice(0, 10);
}

/** Shared order status label definitions */
export const STATUS_LABELS = {
  yeni: { label: "Yeni", cls: "bg-[#E8AA42]/15 text-[#9F7012] border-[#E8AA42]/30" },
  hazirlaniyor: { label: "Hazırlanıyor", cls: "bg-[#4A7C9D]/15 text-[#2F587A] border-[#4A7C9D]/30" },
  tamamlandi: { label: "Tamamlandı", cls: "bg-[#4A5D23]/15 text-[#3A4A1A] border-[#4A5D23]/30" },
  iptal: { label: "İptal", cls: "bg-[#B93A32]/15 text-[#7A2520] border-[#B93A32]/30" },
};
