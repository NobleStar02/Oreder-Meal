import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { formatApiErrorDetail } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { ChefHat } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success("Hoş geldiniz!");
      navigate(u.role === "admin" ? "/admin" : "/menu");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img
          src="/login-bg.jpg"
          alt="Sıcak güveç"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#2C2A29]/70 via-[#2C2A29]/40 to-transparent" />
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md grid place-items-center">
              <ChefHat size={20} />
            </div>
            <div className="leading-tight">
              <div className="font-heading font-bold tracking-tight">Doyuran Güveç</div>
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">Lokantası</div>
            </div>
          </Link>
          <div className="max-w-md">
            <div className="text-xs uppercase tracking-[0.25em] font-bold opacity-80 mb-3">Bugün Mutfaktan</div>
            <div className="font-heading text-4xl font-bold leading-tight">"Sıcak yemek, sıcacık servis. Siparişiniz bizden tek tuşta."</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12 bg-[#F9F6F0]">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-full bg-[#C05A46] grid place-items-center text-white"><ChefHat size={18} /></div>
            <div className="font-heading font-bold tracking-tight">Doyuran Güveç</div>
          </Link>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-[#2C2A29]">Tekrar hoş geldiniz</h1>
          <p className="text-[#5C5855] mt-2">Firma hesabınızla giriş yaparak günün menüsünü görüntüleyin.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#2C2A29] font-medium">E-posta</Label>
              <Input
                id="email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-lg border-[#E5DFD3] focus:border-[#C05A46] focus:ring-[#C05A46]/20"
                placeholder="firma@ornek.com"
                data-testid="login-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#2C2A29] font-medium">Şifre</Label>
              <Input
                id="password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-lg border-[#E5DFD3] focus:border-[#C05A46] focus:ring-[#C05A46]/20"
                placeholder="••••••••"
                data-testid="login-password-input"
              />
            </div>
            <Button
              type="submit" disabled={loading}
              className="w-full h-12 bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full font-semibold"
              data-testid="login-submit-button"
            >
              {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
            </Button>
          </form>

          <div className="mt-6 text-sm text-[#5C5855] text-center">
            Hesabınız yok mu?{" "}
            <Link to="/register" className="text-[#C05A46] font-semibold hover:underline" data-testid="link-to-register">
              Firma kaydı oluşturun
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
