import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

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

export function fileUrl(path) {
  if (!path) return null;
  return `${API}/files/${path}`;
}

export const CATEGORY_ORDER = ["Çorba", "Ana Yemek", "Yan Yemek", "İçecek", "Tatlı"];

export function categoryRank(cat) {
  const i = CATEGORY_ORDER.indexOf(cat);
  return i === -1 ? 999 : i;
}

export function sortByCategory(arr) {
  return [...arr].sort((a, b) => {
    const ra = categoryRank(a.category);
    const rb = categoryRank(b.category);
    if (ra !== rb) return ra - rb;
    return (a.created_at || "").localeCompare(b.created_at || "");
  });
}
