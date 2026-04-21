import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import opeddIcon from "@/assets/opedd-icon.svg";
const WidgetCard = ({ dark = false }: { dark?: boolean }) => {
  const [selectedPrice, setSelectedPrice] = useState<"human" | "ai">("human");
  const [isIndividual, setIsIndividual] = useState(false);

  const bg = dark ? "bg-[hsl(244,100%,10%)]" : "bg-white";
  const border = dark ? "border-[hsl(210,100%,99%,0.12)]" : "border-[hsl(210,100%,97%)]";
  const text = dark ? "text-[hsl(210,100%,99%)]" : "text-[hsl(244,100%,8%)]";
  const textMuted = dark ? "text-[hsl(210,60%,80%)]" : "text-[hsl(244,100%,8%,0.5)]";
  const inputBg = dark ? "bg-[hsl(210,100%,99%,0.08)]" : "bg-white";
  const inputBorder = dark ? "border-[hsl(210,100%,99%,0.15)]" : "border-slate-200";
  const inputText = dark ? "text-[hsl(210,100%,99%)]" : "text-[hsl(244,100%,8%)]";
  const cardShadow = dark ? "shadow-[0_8px_32px_hsl(244,100%,5%,0.5)]" : "shadow-lg";
  const priceBg = dark ? "bg-[hsl(244,50%,18%)]" : "bg-[hsl(210,100%,97%)]";
  const priceActive = "bg-gradient-to-r from-[hsl(245,83%,54%)] to-[hsl(245,83%,62%)] text-white";
  const statBg = dark ? "bg-[hsl(244,50%,18%,0.6)]" : "bg-[hsl(210,100%,97%)]";

  return (
    <div className={`w-[360px] rounded-2xl ${bg} border ${border} ${cardShadow} overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center gap-2.5 px-5 pt-4 pb-3 border-b ${border}`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${dark ? "" : "bg-navy-deep p-1"}`}>
          <img src={opeddIcon} alt="Opedd" className="w-full h-full object-contain" />
        </div>
        <span className={`text-[11px] font-semibold tracking-[0.08em] uppercase ${textMuted}`}>Opedd License</span>
      </div>

      {/* Article Title */}
      <div className="px-5 pt-4 pb-3">
        <h3 className={`text-sm font-semibold ${text} leading-snug`} style={{ fontFamily: "'Newsreader', serif" }}>
          The Future of Content Sovereignty in the Age of AI
        </h3>
      </div>

      {/* Stats Bar */}
      <div className={`mx-5 flex rounded-lg overflow-hidden ${statBg} mb-4`}>
        <div className="flex-1 text-center py-2">
          <p className={`text-[10px] ${textMuted} uppercase tracking-wide`}>Human</p>
          <p className={`text-sm font-bold ${text}`}>12</p>
        </div>
        <div className={`w-px ${border}`} />
        <div className="flex-1 text-center py-2">
          <p className={`text-[10px] ${textMuted} uppercase tracking-wide`}>AI</p>
          <p className={`text-sm font-bold ${text}`}>4</p>
        </div>
      </div>

      {/* Price Selector */}
      <div className={`mx-5 flex gap-2 p-1 rounded-xl ${priceBg} mb-4`}>
        <button
          onClick={() => setSelectedPrice("human")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${selectedPrice === "human" ? priceActive : textMuted}`}
        >
          Human · $10.00
        </button>
        <button
          onClick={() => setSelectedPrice("ai")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${selectedPrice === "ai" ? priceActive : textMuted}`}
        >
          AI Training · $50.00
        </button>
      </div>

      {/* Buyer Form */}
      <div className="px-5 space-y-2.5 mb-4">
        <div className="flex gap-2">
          <input placeholder="First name" className={`flex-1 h-9 rounded-lg border ${inputBorder} ${inputBg} ${inputText} px-3 text-xs placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-[hsl(245,83%,54%)]`} readOnly />
          <input placeholder="Last name" className={`flex-1 h-9 rounded-lg border ${inputBorder} ${inputBg} ${inputText} px-3 text-xs placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-[hsl(245,83%,54%)]`} readOnly />
        </div>
        <input placeholder="Email address" className={`w-full h-9 rounded-lg border ${inputBorder} ${inputBg} ${inputText} px-3 text-xs placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-[hsl(245,83%,54%)]`} readOnly />
        <input placeholder="Company / Organization" className={`w-full h-9 rounded-lg border ${inputBorder} ${inputBg} ${inputText} px-3 text-xs placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-[hsl(245,83%,54%)]`} readOnly />
        
        <label className={`flex items-center gap-2 cursor-pointer ${textMuted} text-xs`} onClick={() => setIsIndividual(!isIndividual)}>
          <div className={`w-4 h-4 rounded border ${isIndividual ? "bg-[hsl(245,83%,54%)] border-[hsl(245,83%,54%)]" : inputBorder} flex items-center justify-center transition-colors`}>
            {isIndividual && <Check size={10} className="text-white" />}
          </div>
          Individual (no organization)
        </label>

        <div className={`relative w-full h-9 rounded-lg border ${inputBorder} ${inputBg} flex items-center px-3`}>
          <span className={`text-xs ${textMuted}`}>Intended use</span>
          <ChevronDown size={14} className={`absolute right-3 ${textMuted}`} />
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-3">
        <button className="w-full h-10 rounded-xl bg-gradient-to-r from-[hsl(245,83%,54%)] to-[hsl(245,83%,62%)] text-white text-sm font-semibold hover:shadow-[0_0_20px_hsl(245,83%,54%,0.4)] transition-all">
          Proceed to Payment
        </button>
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-center gap-1.5 py-3 border-t ${border}`}>
        <img src={opeddIcon} alt="Opedd" className="h-3 w-3 opacity-50" />
        <span className={`text-[10px] ${textMuted}`}>Powered by Opedd Protocol</span>
      </div>
    </div>
  );
};

const WidgetCompact = ({ dark = false }: { dark?: boolean }) => {
  const bg = dark ? "bg-[hsl(244,100%,10%)]" : "bg-white";
  const border = dark ? "border-[hsl(210,100%,99%,0.12)]" : "border-[hsl(210,100%,97%)]";
  const text = dark ? "text-[hsl(210,100%,99%)]" : "text-[hsl(244,100%,8%)]";
  const textMuted = dark ? "text-[hsl(210,60%,80%)]" : "text-[hsl(244,100%,8%,0.5)]";
  const shadow = dark ? "shadow-[0_4px_16px_hsl(244,100%,5%,0.4)]" : "shadow-md";

  return (
    <div className={`w-[360px] rounded-xl ${bg} border ${border} ${shadow} px-4 py-3 flex items-center gap-3`}>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${text} truncate`} style={{ fontFamily: "'Newsreader', serif" }}>
          The Future of Content Sovereignty
        </p>
        <p className={`text-[10px] ${textMuted} mt-0.5`}>From $10.00 · 12 licenses</p>
      </div>
      <button className="shrink-0 h-8 px-4 rounded-lg bg-gradient-to-r from-[hsl(245,83%,54%)] to-[hsl(245,83%,62%)] text-white text-xs font-semibold hover:shadow-[0_0_15px_hsl(245,83%,54%,0.4)] transition-all">
        License
      </button>
    </div>
  );
};

const WidgetBadge = ({ dark = false }: { dark?: boolean }) => {
  const bg = dark ? "bg-[hsl(244,100%,10%)]" : "bg-white";
  const border = dark ? "border-[hsl(210,100%,99%,0.12)]" : "border-[hsl(210,100%,97%)]";
  const text = dark ? "text-[hsl(210,100%,99%)]" : "text-[hsl(244,100%,8%)]";
  const textMuted = dark ? "text-[hsl(210,60%,80%)]" : "text-[hsl(244,100%,8%,0.5)]";
  const shadow = dark ? "shadow-[0_2px_8px_hsl(244,100%,5%,0.3)]" : "shadow-sm";

  return (
    <div className={`inline-flex items-center gap-2 rounded-full ${bg} border ${border} ${shadow} pl-2 pr-3 py-1.5`}>
      <div className="w-5 h-5 flex items-center justify-center">
        <img src={opeddIcon} alt="Opedd" className="w-full h-full object-contain" />
      </div>
      <span className={`text-xs font-semibold ${text}`}>From $10.00</span>
      <span className={`text-[10px] ${textMuted}`}>· 12</span>
    </div>
  );
};

const WidgetPreview = () => {
  return (
    <div className="min-h-screen bg-[hsl(210,100%,97%)] py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-[hsl(244,100%,8%)]">Widget Design Reference</h1>
          <p className="text-sm text-[hsl(244,100%,8%,0.5)] mt-1">
            Static mockups of the embeddable Opedd licensing widget across all variants.
          </p>
        </div>

        {/* Card Variants */}
        <section className="mb-12">
          <h2 className="text-sm font-semibold text-[hsl(244,100%,8%,0.6)] uppercase tracking-wider mb-5">Card Widget</h2>
          <div className="flex flex-wrap gap-8 items-start">
            <div className="space-y-2">
              <span className="text-xs font-medium text-[hsl(244,100%,8%,0.4)]">Light</span>
              <WidgetCard />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium text-[hsl(244,100%,8%,0.4)]">Dark</span>
              <WidgetCard dark />
            </div>
          </div>
        </section>

        {/* Compact Variants */}
        <section className="mb-12">
          <h2 className="text-sm font-semibold text-[hsl(244,100%,8%,0.6)] uppercase tracking-wider mb-5">Compact Widget</h2>
          <div className="flex flex-wrap gap-8 items-start">
            <div className="space-y-2">
              <span className="text-xs font-medium text-[hsl(244,100%,8%,0.4)]">Light</span>
              <WidgetCompact />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium text-[hsl(244,100%,8%,0.4)]">Dark</span>
              <WidgetCompact dark />
            </div>
          </div>
        </section>

        {/* Badge Variants */}
        <section className="mb-12">
          <h2 className="text-sm font-semibold text-[hsl(244,100%,8%,0.6)] uppercase tracking-wider mb-5">Badge Widget</h2>
          <div className="flex flex-wrap gap-8 items-start">
            <div className="space-y-2">
              <span className="text-xs font-medium text-[hsl(244,100%,8%,0.4)]">Light</span>
              <WidgetBadge />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium text-[hsl(244,100%,8%,0.4)]">Dark</span>
              <WidgetBadge dark />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default WidgetPreview;
