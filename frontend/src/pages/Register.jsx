import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { ChefHat } from "lucide-react";

export default function Register() {
  const { register, formatApiErrorDetail } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    company_name: "", contact_name: "", phone: "", address: "",
    email: "", password: "",
  });
  const [loading, setLoading] = useState(false);
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Firma kaydınız oluşturuldu!");
      navigate("/menu");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center p-5 md:p-12">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#E5DFD3] shadow-sm p-8 md:p-12">
        <Link to="/" className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-full bg-[#C05A46] grid place-items-center text-white"><ChefHat size={18} /></div>
          <div className="font-heading font-bold tracking-tight">Doyuran Güveç</div>
        </Link>
        <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-[#2C2A29]">Firma Kaydı Oluştur</h1>
        <p className="text-[#5C5855] mt-2">Birkaç bilgi yeterli — saniyeler içinde sipariş vermeye başlayın.</p>

        <form onSubmit={onSubmit} className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="register-form">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="company_name">Firma Adı *</Label>
            <Input id="company_name" required value={form.company_name} onChange={upd("company_name")} className="h-12 rounded-lg border-[#E5DFD3]" placeholder="Örn: Acme Yazılım A.Ş." data-testid="register-company-name-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_name">Yetkili Kişi</Label>
            <Input id="contact_name" value={form.contact_name} onChange={upd("contact_name")} className="h-12 rounded-lg border-[#E5DFD3]" placeholder="Ad Soyad" data-testid="register-contact-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" value={form.phone} onChange={upd("phone")} className="h-12 rounded-lg border-[#E5DFD3]" placeholder="0555 ..." data-testid="register-phone-input" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Adres / Teslimat Notu</Label>
            <Textarea id="address" value={form.address} onChange={upd("address")} className="rounded-lg border-[#E5DFD3] min-h-[80px]" placeholder="Ofis adresi, kat, kapı no…" data-testid="register-address-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-posta *</Label>
            <Input id="email" type="email" required value={form.email} onChange={upd("email")} className="h-12 rounded-lg border-[#E5DFD3]" data-testid="register-email-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Şifre *</Label>
            <Input id="password" type="password" required minLength={6} value={form.password} onChange={upd("password")} className="h-12 rounded-lg border-[#E5DFD3]" data-testid="register-password-input" />
          </div>
          <div className="md:col-span-2 mt-2">
            <Button type="submit" disabled={loading} className="w-full h-12 bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full font-semibold" data-testid="register-submit-button">
              {loading ? "Kaydediliyor…" : "Hesap Oluştur"}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-sm text-[#5C5855] text-center">
          Zaten hesabınız var mı?{" "}
          <Link to="/login" className="text-[#C05A46] font-semibold hover:underline" data-testid="link-to-login">Giriş yapın</Link>
        </div>
      </div>
    </div>
  );
}
