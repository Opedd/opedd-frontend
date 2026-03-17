import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight, PartyPopper } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

interface StepState {
  content_imported: boolean;
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
    key: "stripe_connected" as const,
    label: "Connect Stripe",
    cta: "Connect Stripe",
    path: "/payments",
  },
  {
    key: "widget_added" as const,
    label: "Embed the licensing widget",
    cta: "Get embed code",
    path: "/connectors?tab=widget",
  },
];

const DISMISS_KEY = "opedd_onboarding_complete_dismissed";

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const { user, getAccessToken } = useAuth();
  const [steps, setSteps] = useState<StepState>({
    content_imported: false,
    stripe_connected: false,
    widget_added: false,
  });
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "true");

  const fetchState = useCallback(async () => {
    if (!user) return;
    try {
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
      const stripeConnected = profileData?.stripe_onboarding_complete === true;

      setSteps({
        content_imported: hasContent,
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

  if (loading) return null;

  const completedCount = Object.values(steps).filter(Boolean).length;
  const totalCount = STEPS.length;
  const allDone = completedCount === totalCount;
  const pct = (completedCount / totalCount) * 100;

  // Only hide when all done AND user has dismissed the success state
  if (allDone && dismissed) return null;

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
              localStorage.setItem(DISMISS_KEY, "true");
            }}
            className="text-xs text-[#9CA3AF] hover:text-[#6B7280] font-medium"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

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
        {STEPS.map((step) => {
          const done = steps[step.key];

          return (
            <li key={step.key}>
              <div
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  done ? "bg-transparent" : "hover:bg-[#F9FAFB]"
                }`}
              >
                {done ? (
                  <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle size={20} className="text-[#D1D5DB] flex-shrink-0" />
                )}
                <span
                  className={`text-sm flex-1 ${
                    done ? "text-[#9CA3AF] line-through" : "text-[#111827] font-medium"
                  }`}
                >
                  {step.label}
                </span>
                {!done && (
                  <Button
                    size="sm"
                    onClick={() => navigate(step.path)}
                    className="h-8 px-3 text-xs bg-[#3182CE] hover:bg-[#2B6CB0] text-white font-semibold rounded-lg"
                  >
                    {step.cta}
                    <ArrowRight size={12} className="ml-1" />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
