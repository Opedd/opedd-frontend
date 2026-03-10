import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight, PartyPopper } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

interface StepState {
  content_imported: boolean;
  pricing_set: boolean;
  stripe_connected: boolean;
  widget_added: boolean;
}

const STEPS = [
  {
    key: "content_imported" as const,
    label: "Import your content",
    cta: "Import content",
    path: "/content",
  },
  {
    key: "pricing_set" as const,
    label: "Set your pricing",
    cta: "Set pricing",
    path: "/settings?tab=pricing",
  },
  {
    key: "stripe_connected" as const,
    label: "Connect Stripe",
    cta: "Connect Stripe",
    path: "/settings?tab=payouts",
  },
  {
    key: "widget_added" as const,
    label: "Add the widget",
    cta: "Add widget",
    path: "/connectors",
  },
];

const DISMISS_KEY = "opedd_onboarding_dismissed";

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const { user, getAccessToken } = useAuth();
  const [steps, setSteps] = useState<StepState>({
    content_imported: false,
    pricing_set: false,
    stripe_connected: false,
    widget_added: false,
  });
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === "true");

  const fetchState = useCallback(async () => {
    if (!user) return;
    try {
      // Parallel: check assets count, sources with widget-eligible types, and publisher profile
      const [assetsRes, sourcesRes, profileData] = await Promise.all([
        supabase
          .from("assets")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("rss_sources")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("sync_status", "active"),
        (async () => {
          try {
            const token = await getAccessToken();
            const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
              headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            return json.success ? json.data : null;
          } catch {
            return null;
          }
        })(),
      ]);

      const hasContent = (assetsRes.count ?? 0) > 0;
      const hasWidget = (sourcesRes.count ?? 0) > 0;

      const defaultHuman = profileData?.default_human_price ?? 0;
      const defaultAi = profileData?.default_ai_price ?? 0;
      const pricingSet = defaultHuman > 0 || defaultAi > 0;

      const stripeConnected = profileData?.stripe_onboarding_complete === true;

      setSteps({
        content_imported: hasContent,
        pricing_set: pricingSet,
        stripe_connected: stripeConnected,
        widget_added: hasWidget,
      });
    } catch (err) {
      console.warn("[OnboardingChecklist] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, getAccessToken]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  if (loading || dismissed) return null;

  const completedCount = Object.values(steps).filter(Boolean).length;
  const totalCount = STEPS.length;
  const allDone = completedCount === totalCount;
  const pct = (completedCount / totalCount) * 100;

  if (allDone) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <PartyPopper size={24} className="text-emerald-500 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-base font-bold text-[#111827]">You're all set!</h3>
            <p className="text-sm text-[#6B7280] mt-0.5">Your publication is fully configured and ready to earn.</p>
          </div>
          <button
            onClick={() => {
              setDismissed(true);
              sessionStorage.setItem(DISMISS_KEY, "true");
            }}
            className="text-xs text-[#9CA3AF] hover:text-[#6B7280] font-medium"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  const firstIncompleteIdx = STEPS.findIndex((s) => !steps[s.key]);

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#111827]">Get started with Opedd</h3>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {completedCount} of {totalCount} steps complete
          </p>
        </div>
      </div>

      <Progress value={pct} className="h-2 mb-5 bg-[#F3F4F6] [&>div]:bg-[#4A26ED]" />

      <ul className="space-y-1">
        {STEPS.map((step, idx) => {
          const done = steps[step.key];
          const isNext = idx === firstIncompleteIdx;

          return (
            <li key={step.key}>
              <button
                onClick={() => navigate(step.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  isNext
                    ? "bg-[#4A26ED]/5 hover:bg-[#4A26ED]/10"
                    : "hover:bg-[#F9FAFB]"
                }`}
              >
                {done ? (
                  <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle size={20} className={`flex-shrink-0 ${isNext ? "text-[#4A26ED]" : "text-[#D1D5DB]"}`} />
                )}
                <span
                  className={`text-sm flex-1 ${
                    done
                      ? "text-[#9CA3AF] line-through"
                      : isNext
                        ? "text-[#111827] font-semibold"
                        : "text-[#6B7280]"
                  }`}
                >
                  {step.label}
                </span>
                {!done && isNext && (
                  <span className="text-xs font-semibold text-[#4A26ED] bg-[#4A26ED]/10 px-2.5 py-1 rounded-md">
                    {step.cta}
                  </span>
                )}
                {!done && !isNext && <ArrowRight size={16} className="text-[#D1D5DB] flex-shrink-0" />}
                {done && <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 opacity-50" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
