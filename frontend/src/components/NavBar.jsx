import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useCart } from "../lib/cart";
import { Button } from "../components/ui/button";
import { ShoppingBag, LogOut, ChefHat, LayoutDashboard, ClipboardList, Globe, Utensils } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useLanguage } from "../lib/language";

export default function NavBar({ onCartClick }) {
  const { user, logout } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const { language, t, changeLanguage } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-[#F9F6F0]/85 backdrop-blur-xl border-b border-[#E5DFD3]/60">
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" data-testid="nav-logo">
          <div className="w-9 h-9 rounded-full bg-[#C05A46] grid place-items-center text-white shrink-0">
            <ChefHat size={18} />
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="font-heading font-bold text-[15px] text-[#2C2A29] tracking-tight">{t("logo_title")}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A8580] font-semibold">{t("logo_subtitle")}</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {user && user.role === "company" && (
            <>
              <Link to="/menu" className="inline-flex items-center text-sm font-medium text-[#5C5855] hover:text-[#C05A46] px-2 py-2 transition-colors" data-testid="nav-menu">
                <Utensils size={16} className="sm:mr-1.5" />
                <span className="hidden sm:inline">{t("nav_menu")}</span>
              </Link>
              <Link to="/orders" className="inline-flex items-center text-sm font-medium text-[#5C5855] hover:text-[#C05A46] px-2 py-2 transition-colors" data-testid="nav-orders">
                <ClipboardList size={16} className="sm:mr-1.5" />
                <span className="hidden sm:inline">{t("nav_orders")}</span>
              </Link>
              {onCartClick && (
                <Button
                  onClick={onCartClick}
                  className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full px-3 sm:px-4 relative h-9 sm:h-10"
                  data-testid="nav-cart-button"
                >
                  <ShoppingBag size={16} className="sm:mr-2" />
                  <span className="hidden sm:inline">{t("nav_cart")}</span>
                  {cart.count > 0 && (
                    <span className="ml-1 sm:ml-2 bg-white text-[#C05A46] rounded-full text-[10px] sm:text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 grid place-items-center">
                      {cart.count}
                    </span>
                  )}
                </Button>
              )}
            </>
          )}
          {user && user.role === "admin" && (
            <Link to="/admin" data-testid="nav-admin-dashboard">
              <Button variant="outline" className="rounded-full border-[#E5DFD3] hover:border-[#C05A46] hover:text-[#C05A46]">
                <LayoutDashboard size={16} className="mr-2" /> {t("nav_admin")}
              </Button>
            </Link>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full text-[#5C5855] hover:text-[#C05A46]">
                <Globe size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-[#E5DFD3] rounded-xl shadow-md min-w-[120px]">
              <DropdownMenuItem onClick={() => changeLanguage("tr")} className="flex items-center gap-2 cursor-pointer hover:bg-[#F2EBE3]">
                <span>🇹🇷</span> Türkçe
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage("az")} className="flex items-center gap-2 cursor-pointer hover:bg-[#F2EBE3]">
                <span>🇦🇿</span> Azərbaycan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage("ar")} className="flex items-center gap-2 cursor-pointer hover:bg-[#F2EBE3]">
                <span>🇸🇾</span> العربية
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <Button
              onClick={async () => { await logout(); navigate("/"); }}
              variant="ghost"
              className="rounded-full text-[#5C5855] hover:text-[#C05A46]"
              data-testid="nav-logout"
              title={t("nav_logout")}
            >
              <LogOut size={16} />
            </Button>
          ) : (
            <>
              <Link to="/login" data-testid="nav-login">
                <Button variant="ghost" className="rounded-full text-[#5C5855] hover:text-[#C05A46]">{t("nav_login")}</Button>
              </Link>
              <Link to="/register" data-testid="nav-register">
                <Button className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full px-5">{t("nav_register")}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
