import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { ChefHat, LayoutDashboard, Utensils, ListOrdered, BarChart3, LogOut, ExternalLink } from "lucide-react";
import { Button } from "../../components/ui/button";

const linkBase = "flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-colors";
const linkActive = "bg-[#C05A46] text-white";
const linkInactive = "text-[#5C5855] hover:text-[#C05A46] hover:bg-[#F2EBE3]";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#F5F3EC] grid grid-cols-1 lg:grid-cols-[260px_1fr]">
      <aside className="bg-white border-r border-[#E5DFD3] p-5 lg:p-6 lg:sticky lg:top-0 lg:h-screen flex flex-col">
        <Link to="/admin" className="flex items-center gap-2.5 pb-6 border-b border-[#E5DFD3]">
          <div className="w-9 h-9 rounded-full bg-[#C05A46] grid place-items-center text-white"><ChefHat size={18} /></div>
          <div className="leading-tight">
            <div className="font-heading font-bold text-[15px] tracking-tight">Doyuran Güveç</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A8580] font-bold">Yönetim</div>
          </div>
        </Link>

        <nav className="mt-6 space-y-1.5 flex-1">
          <NavLink end to="/admin" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`} data-testid="admin-nav-dashboard">
            <LayoutDashboard size={16} /> Genel Bakış
          </NavLink>
          <NavLink to="/admin/menu" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`} data-testid="admin-nav-menu">
            <Utensils size={16} /> Menü Yönetimi
          </NavLink>
          <NavLink to="/admin/orders" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`} data-testid="admin-nav-orders">
            <ListOrdered size={16} /> Siparişler
          </NavLink>
          <NavLink to="/admin/analytics" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`} data-testid="admin-nav-analytics">
            <BarChart3 size={16} /> Analitik
          </NavLink>
        </nav>

        <div className="pt-6 border-t border-[#E5DFD3] space-y-2">
          <Link to="/" target="_blank" className="flex items-center gap-2 text-xs text-[#8A8580] hover:text-[#C05A46]">
            <ExternalLink size={12} /> Müşteri görünümü
          </Link>
          <div className="text-xs text-[#5C5855] truncate">{user?.email}</div>
          <Button onClick={async () => { await logout(); navigate("/"); }} variant="outline" className="w-full rounded-full border-[#E5DFD3] hover:border-[#C05A46] hover:text-[#C05A46]" data-testid="admin-logout">
            <LogOut size={14} className="mr-2" /> Çıkış
          </Button>
        </div>
      </aside>

      <main className="p-5 md:p-8 lg:p-10">
        <Outlet />
      </main>
    </div>
  );
}
