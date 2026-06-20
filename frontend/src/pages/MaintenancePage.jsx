import { useLanguage } from "../lib/language";
import { Wrench, Globe } from "lucide-react";

export default function MaintenancePage() {
  const { t, language, changeLanguage, isRtl } = useLanguage();

  return (
    <div 
      className="min-h-screen bg-[#F9F6F0] flex flex-col items-center justify-center p-6 relative overflow-hidden"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Background patterns */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none select-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#C05A46] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#4A5D23] blur-[120px]" />
      </div>

      {/* Language selector in corner */}
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-white/80 backdrop-blur-md px-3.5 py-2 rounded-full border border-[#E5DFD3] shadow-sm z-50">
        <Globe size={15} className="text-[#8A8580]" />
        <select
          value={language}
          onChange={(e) => changeLanguage(e.target.value)}
          className="bg-transparent border-none text-xs font-semibold text-[#5C5855] focus:outline-none cursor-pointer"
        >
          <option value="tr">Türkçe (TR)</option>
          <option value="az">Azərbaycanca (AZ)</option>
          <option value="ar">العربية (AR)</option>
        </select>
      </div>

      {/* Main card */}
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#E5DFD3] shadow-xl p-8 md:p-10 text-center relative z-10">
        <div className="w-16 h-16 rounded-full bg-[#C05A46]/10 flex items-center justify-center mx-auto mb-6 text-[#C05A46]">
          <Wrench size={30} className="animate-pulse" />
        </div>

        <h1 className="font-heading text-3xl font-bold tracking-tight text-[#2C2A29] mb-4">
          {t("maintenance_title")}
        </h1>

        <p className="text-[#5C5855] leading-relaxed text-sm md:text-base">
          {t("maintenance_desc")}
        </p>

        <div className="mt-8 pt-6 border-t border-dashed border-[#E5DFD3] text-xs text-[#8A8580] font-medium uppercase tracking-widest">
          Doyuran Güveç Lokantası
        </div>
      </div>
    </div>
  );
}
