import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight, PartyPopper, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

interface SetupState {
  content_imported: boolean;
  stripe_connected: boolean;
  widget_added: boolean;
  setup_complete: boolean;
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

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const { getAccessToken } = useAuth();
  const [isStripeConnecting, setIsStripeConnecting] = useState(false);
  const [state, setState] = useState<SetupState>({
    content_imported: false,
    stripe_connected: false,
    widget_added: false,
    setup_complete: false,
  });
  const [loading, setLoading] = useState(true);
  // Local dismiss: only used to hide the "You're all set!" banner in the current session.
  // The checklist is permanently hidden once setup_complete=true in DB (no localStorage needed).
  const [sessionDismissed, setSessionDismissed] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setState({
          content_imported: d.content_imported || false,
          stripe_connected: d.stripe_onboarding_complete || false,
          widget_added: d.widget_added || false,
          setup_complete: d.setup_complete || false,
        });
      }
    } catch (err) {
      console.warn("[OnboardingChecklist] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  const handleConnectStripe = useCallback(async () => {
    setIsStripeConnecting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "POST",
        headers: {
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "connect_stripe" }),
      });
      const result = await res.json();
      if (result.success && result.data?.onboarding_url) {
        window.location.href = result.data.onboarding_url;
      }
    } catch {
      navigate("/payments");
    } finally {
      setIsStripeConnecting(false);
    }
  }, [getAccessToken, navigate]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  if (loading) return null;

  const stepKeys = ["content_imported", "stripe_connected", "widget_added"] as const;
  const completedCount = stepKeys.filter((k) => state[k]).length;
  const totalCount = STEPS.length;
  const allDone = completedCount === totalCount;
  const pct = (completedCount / totalCount) * 100;

  // Hide permanently only when setup was completed AND all steps are still active.
  // If a step later becomes incomplete (e.g. Stripe disconnected), show the checklist again.
  if (state.setup_complete && allDone) return null;

  // All 3 steps done but setup_complete not yet persisted — show success banner
  if (allDone) {
    if (sessionDismissed) return null;
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <PartyPopper size={24} className="text-emerald-500 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-base font-bold text-[#111827]">You're all set!</h3>
            <p className="text-sm text-[#6B7280] mt-0.5">Your publication is fully configured and ready to earn.</p>
          </div>
          <button
            onClick={() => setSessionDismissed(true)}
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
          const done = state[step.key];

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
                    onClick={() => step.key === "stripe_connected" ? handleConnectStripe() : navigate(step.path)}
                    disabled={step.key === "stripe_connected" && isStripeConnecting}
                    className="h-8 px-3 text-xs bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold rounded-lg"
                  >
                    {step.key === "stripe_connected" && isStripeConnecting ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <>{step.cta}<ArrowRight size={12} className="ml-1" /></>
                    )}
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
