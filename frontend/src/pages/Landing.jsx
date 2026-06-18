import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { Button } from "../components/ui/button";
import { ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useLanguage } from "../lib/language";

export default function Landing() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex flex-col justify-between">
      <div>
        <NavBar />

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-5 md:px-8 pt-12 md:pt-20 pb-16 grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 fade-up">
              <div className="inline-flex items-center gap-2 bg-[#F2EBE3] border border-[#E5DFD3] rounded-full px-3 py-1.5 mb-6">
                <span className="w-2 h-2 rounded-full bg-[#4A5D23] animate-pulse"></span>
                <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#5C5855]">{t("hero_badge")}</span>
              </div>
              <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#2C2A29] leading-[0.95]">
                {t("hero_title")}
              </h1>
              <p className="mt-6 text-base md:text-lg text-[#5C5855] max-w-xl leading-relaxed">
                {t("hero_desc")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={user ? (user.role === "admin" ? "/admin" : "/menu") : "/register"} data-testid="hero-cta-primary">
                  <Button className="bg-[#C05A46] hover:bg-[#A64A38] text-white rounded-full px-7 py-6 text-base shadow-md">
                    {user ? (user.role === "admin" ? t("hero_cta_admin") : t("hero_cta_menu")) : t("hero_cta_register")}
                    <ArrowRight size={18} className="ml-2 rtl:rotate-180" />
                  </Button>
                </Link>
                {!user && (
                  <Link to="/login" data-testid="hero-cta-login">
                    <Button variant="outline" className="rounded-full border-2 border-[#E5DFD3] hover:border-[#C05A46] hover:text-[#C05A46] px-7 py-6 text-base">
                      {t("hero_cta_login")}
                    </Button>
                  </Link>
                )}
              </div>
              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#5C5855]">
                <div className="flex items-center gap-2"><Clock size={16} className="text-[#C05A46]" /> {t("hero_feat_dinner")}</div>
                <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#C05A46]" /> {t("hero_feat_history")}</div>
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
      </div>

      <footer className="border-t border-[#E5DFD3] bg-[#F9F6F0]">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-[#8A8580]">
          <div>{t("footer_text", { year: new Date().getFullYear() })}</div>
          <div className="font-mono text-xs">{t("footer_tag")}</div>
        </div>
      </footer>
    </div>
  );
}
