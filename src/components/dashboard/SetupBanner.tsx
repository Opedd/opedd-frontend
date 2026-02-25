import React, { useState, useEffect } from "react";
import { Check, Zap, X, AlertTriangle } from "lucide-react";

interface SetupBannerProps {
  pricingDone: boolean;
  widgetDone: boolean;
  onSetPricing: () => void;
  onEmbedWidget: () => void;
}

const BANNER_KEY = "opedd_setup_banner_dismissed";

export function SetupBanner({ pricingDone, widgetDone, onSetPricing, onEmbedWidget }: SetupBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const val = sessionStorage.getItem(BANNER_KEY);
    if (val === "true") setDismissed(true);
  }, []);

  // Hide if all steps done
  if (pricingDone && widgetDone) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(BANNER_KEY, "true");
  };

  const steps = [
    { label: "Publication", done: true },
    { label: "Verified", done: true },
    { label: "Pricing", done: pricingDone },
    { label: "Widget", done: widgetDone },
  ];

  return (
    <div className="bg-[#040042] rounded-2xl px-6 py-4 relative">
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-white/40 hover:text-white/70 transition-colors"
      >
        <X size={16} />
      </button>

      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <Zap size={16} className="text-[#A78BFA] flex-shrink-0" />
        <span className="text-white font-semibold text-sm">Verified and live</span>
        <span className="text-white/50 text-sm">·</span>
        <span className="text-white/60 text-sm">Complete your setup to go fully live</span>
      </div>

      {/* Step pills + actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((s) => (
          <span
            key={s.label}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
              s.done
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
            }`}
          >
            {s.done ? <Check size={12} className="flex-shrink-0" /> : <AlertTriangle size={12} className="flex-shrink-0" />}
            {s.label}
          </span>
        ))}

        <div className="flex-1" />

        {!pricingDone && (
          <button
            onClick={onSetPricing}
            className="border border-white/20 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors font-medium"
          >
            Set pricing
          </button>
        )}
        {!widgetDone && (
          <button
            onClick={onEmbedWidget}
            className="border border-white/20 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors font-medium"
          >
            Embed widget
          </button>
        )}
      </div>
    </div>
  );
}
