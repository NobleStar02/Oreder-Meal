import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { Button } from "../components/ui/button";
import { ArrowRight, Clock, Printer, BarChart3, ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[#F9F6F0]">
      <NavBar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 md:px-8 pt-12 md:pt-20 pb-16 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 fade-up">
            <div className="inline-flex items-center gap-2 bg-[#F2EBE3] border border-[#E5DFD3] rounded-full px-3 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#4A5D23] animate-pulse"></span>
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#5C5855]">Bugün Mutfaktan Taze</span>
            </div>
            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#2C2A29] leading-[0.95]">
              Öğle yemeği siparişlerinizi <span className="text-[#C05A46] italic">tek tıkla</span> bizden alın.
            </h1>
            <p className="mt-6 text-base md:text-lg text-[#5C5855] max-w-xl leading-relaxed">
              WhatsApp'ta tek tek yazışmadan, fiş yazmadan. Doyuran Güveç Lokantası'nın günlük menüsünü görün, firma adınızla sipariş geçin — siparişiniz mutfağımıza otomatik olarak ulaşsın.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={user ? (user.role === "admin" ? "/admin" : "/menu") : "/register"} data-testid="hero-cta-primary">
                <Button className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full px-7 py-6 text-base shadow-md">
                  {user ? (user.role === "admin" ? "Yönetim Paneline Git" : "Bugünün Menüsüne Geç") : "Firma Olarak Kayıt Ol"}
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>
              {!user && (
                <Link to="/login" data-testid="hero-cta-login">
                  <Button variant="outline" className="rounded-full border-2 border-[#E5DFD3] hover:border-[#C05A46] hover:text-[#C05A46] px-7 py-6 text-base">
                    Giriş Yap
                  </Button>
                </Link>
              )}
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#5C5855]">
              <div className="flex items-center gap-2"><Clock size={16} className="text-[#C05A46]" /> Akşam yemeği seçeneği</div>
              <div className="flex items-center gap-2"><Printer size={16} className="text-[#C05A46]" /> Otomatik termal yazıcı</div>
              <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#C05A46]" /> Firma bazlı geçmiş</div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-[#E5DFD3] aspect-[4/5]">
              <img
                src="/hero-guvec.png"
                alt="Sıcak güveç yemekleri"
                className="w-full h-full object-cover"
              />

            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#F2EBE3]/60 border-y border-[#E5DFD3]">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="text-xs uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-3">Nasıl Çalışır</div>
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-[#2C2A29] tracking-tight max-w-2xl">Üç adımda sipariş — tüm karmaşa biter.</h2>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { num: "01", title: "Firmanızı Kaydedin", desc: "E-posta ve şifre ile dakikalar içinde firmanızı sisteme tanıtın." },
              { num: "02", title: "Menüden Seçin", desc: "Her gün taze hazırlanan menüden yemeklerinizi adetleriyle birlikte seçin." },
              { num: "03", title: "Mutfağa Otomatik Düşsün", desc: "Sipariş onaylandığı an mutfağımızdaki termal yazıcıdan fişiniz çıkar." },
            ].map((f, i) => (
              <div
                key={f.num}
                className="bg-white rounded-2xl border border-[#E5DFD3] p-7 hover:shadow-md transition-all hover:-translate-y-1 fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="font-mono text-[#C05A46] text-sm font-semibold">{f.num}</div>
                <div className="font-heading text-2xl font-bold text-[#2C2A29] mt-3">{f.title}</div>
                <p className="text-[#5C5855] mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Owner stats */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="rounded-3xl overflow-hidden border border-[#E5DFD3] shadow-md">
            <img
              src="https://images.unsplash.com/photo-1645453014403-4ad5170a386c?crop=entropy&cs=srgb&fm=jpg&q=80"
              alt="Lokanta"
              className="w-full h-[420px] object-cover"
            />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.25em] font-bold text-[#C05A46] mb-3">Lokanta Sahibine</div>
            <h2 className="font-heading text-3xl md:text-5xl font-bold text-[#2C2A29] tracking-tight">Hangi yemek ne kadar tutuyor — anında bilin.</h2>
            <p className="mt-5 text-[#5C5855] leading-relaxed">
              Yönetim panelinde bugünkü siparişler, haftalık ve aylık en çok seçilen yemekler, firma bazlı analizler ve ciro grafiklerini tek ekranda görün. Hangi günü hangi menüyle daha verimli geçirdiğinizi öğrenin.
            </p>
            <ul className="mt-6 space-y-3">
              {["Anlık sipariş akışı", "Termal yazıcıya tek tıkla yazdırma", "Firma bazlı sipariş geçmişi", "Haftalık/aylık ciro raporları"].map((t) => (
                <li key={t} className="flex items-center gap-3 text-[#2C2A29]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C05A46]"></div>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Link to="/login" className="inline-flex mt-7" data-testid="owner-cta">
              <Button className="bg-[#2C2A29] hover:bg-[#1a1918] text-white rounded-full px-6">
                Yönetim Paneline Git <BarChart3 size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E5DFD3] bg-[#F9F6F0]">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-[#8A8580]">
          <div>© {new Date().getFullYear()} Doyuran Güveç Lokantası. Tüm hakları saklıdır.</div>
          <div className="font-mono text-xs">Günlük taze • Öğle paketi</div>
        </div>
      </footer>
    </div>
  );
}
