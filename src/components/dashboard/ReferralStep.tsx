import React, { useState } from "react";
import { Loader2, MessageSquare, X, Rocket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

const OPTIONS = [
  { label: "Twitter / X", icon: "𝕏" },
  { label: "LinkedIn", icon: "in" },
  { label: "Google Search", icon: "🔍" },
  { label: "ChatGPT / AI tool", icon: "🤖" },
  { label: "Word of mouth", icon: "🗣️" },
  { label: "Press / Media", icon: "📰" },
  { label: "Product Hunt", icon: <Rocket size={16} /> },
  { label: "Other", icon: "✏️" },
];

interface ReferralStepProps {
  onComplete: () => void;
}

export function ReferralStep({ onComplete }: ReferralStepProps) {
  const { getAccessToken } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const saveReferral = async (value: string) => {
    setSubmitting(true);
    // Cache immediately so navigation doesn't re-show the modal
    localStorage.setItem("opedd_referral_done", "1");
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ referral_source: value }),
      });
      const result = await res.json();
      if (!result.success) console.warn("[ReferralStep] save failed:", result.error);
    } catch (err) {
      console.warn("[ReferralStep] save error:", err);
    } finally {
      setSubmitting(false);
      onComplete();
    }
  };

  const handleSubmit = () => {
    if (!selected) return;
    const value = selected === "Other" ? (otherText.trim() || "Other") : selected;
    saveReferral(value);
  };

  const handleSkip = () => {
    localStorage.setItem("opedd_referral_done", "1");
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
      <div className="relative bg-white rounded-xl border border-slate-200 shadow-card p-8 w-full max-w-md mx-4 space-y-6">
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center transition-colors active:scale-95"
          aria-label="Skip"
        >
          <X size={16} className="text-gray-500" />
        </button>
        <div>
          <div className="w-12 h-12 bg-oxford/10 rounded-xl flex items-center justify-center mb-4">
            <MessageSquare size={24} className="text-oxford" />
          </div>
          <h3 className="text-xl font-bold text-navy-deep">How did you hear about Opedd?</h3>
          <p className="text-sm text-gray-500 mt-1">This helps us understand how publishers find us.</p>
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setSelected(opt.label)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left text-sm font-medium transition-all ${
                selected === opt.label
                  ? "border-oxford bg-oxford/5 text-navy-deep ring-2 ring-oxford/20"
                  : "border-slate-200 text-gray-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="text-base flex-shrink-0">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Other free text */}
        {selected === "Other" && (
          <Input
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="Tell us where…"
            className="h-11"
            autoFocus
          />
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!selected || submitting}
          className="w-full bg-gradient-to-r from-oxford to-violet-600 text-white h-11 px-6 rounded-xl font-semibold text-sm flex items-center gap-2 justify-center disabled:opacity-50 transition-all hover:shadow-popover"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving…
            </>
          ) : (
            "Continue to Dashboard"
          )}
        </button>
      </div>
    </div>
  );
}
