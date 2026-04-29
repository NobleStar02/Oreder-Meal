import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useCart } from "../lib/cart";
import { Button } from "../components/ui/button";
import { ShoppingBag, LogOut, ChefHat, LayoutDashboard, ClipboardList } from "lucide-react";

export default function NavBar({ onCartClick }) {
  const { user, logout } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-[#F9F6F0]/85 backdrop-blur-xl border-b border-[#E5DFD3]/60">
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" data-testid="nav-logo">
          <div className="w-9 h-9 rounded-full bg-[#C05A46] grid place-items-center text-white">
            <ChefHat size={18} />
          </div>
          <div className="leading-tight">
            <div className="font-heading font-bold text-[15px] text-[#2C2A29] tracking-tight">Doyuran Güveç</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A8580] font-semibold">Lokantası</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {user && user.role === "company" && (
            <>
              <Link to="/menu" className="hidden sm:inline-flex text-sm font-medium text-[#5C5855] hover:text-[#C05A46] px-3 py-2 transition-colors" data-testid="nav-menu">
                Günün Menüsü
              </Link>
              <Link to="/orders" className="hidden sm:inline-flex text-sm font-medium text-[#5C5855] hover:text-[#C05A46] px-3 py-2 transition-colors" data-testid="nav-orders">
                <ClipboardList size={16} className="mr-1.5" /> Siparişlerim
              </Link>
              {onCartClick && (
                <Button
                  onClick={onCartClick}
                  className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full px-4 relative"
                  data-testid="nav-cart-button"
                >
                  <ShoppingBag size={16} className="mr-2" /> Sepet
                  {cart.count > 0 && (
                    <span className="ml-2 bg-white text-[#C05A46] rounded-full text-xs font-bold w-5 h-5 grid place-items-center">
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
                <LayoutDashboard size={16} className="mr-2" /> Yönetim
              </Button>
            </Link>
          )}
          {user ? (
            <Button
              onClick={async () => { await logout(); navigate("/"); }}
              variant="ghost"
              className="rounded-full text-[#5C5855] hover:text-[#C05A46]"
              data-testid="nav-logout"
            >
              <LogOut size={16} />
            </Button>
          ) : (
            <>
              <Link to="/login" data-testid="nav-login">
                <Button variant="ghost" className="rounded-full text-[#5C5855] hover:text-[#C05A46]">Giriş</Button>
              </Link>
              <Link to="/register" data-testid="nav-register">
                <Button className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full px-5">Firma Kaydı</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
