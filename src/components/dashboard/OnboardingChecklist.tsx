import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Circle, ArrowRight, PartyPopper, Loader2, Copy, Check,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

interface Props {
  contentImported: boolean;
  pricingConfigured: boolean;
  stripeConnected: boolean;
  setupComplete: boolean;
  publisherSlug: string | null;
  onRegisterContent?: () => void;
}

export function OnboardingChecklist({
  contentImported,
  pricingConfigured,
  stripeConnected,
  setupComplete,
  publisherSlug,
  onRegisterContent,
}: Props) {
  const navigate = useNavigate();
  const { getAccessToken } = useAuth();
  const { toast } = useToast();

  const [isStripeConnecting, setIsStripeConnecting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState(
    () => localStorage.getItem("opedd_checklist_dismissed") === "true"
  );

  // Step 4 completes automatically when steps 1–3 are all done
  const shareComplete = contentImported && pricingConfigured && stripeConnected;

  const steps = [
    {
      key: "content" as const,
      label: "Import your content",
      description: "Add your RSS feed or sitemap to populate your catalog.",
      cta: "Import Content",
      done: contentImported,
    },
    {
      key: "pricing" as const,
      label: "Set up your license types",
      description: "Configure what types of licenses you offer and at what price.",
      cta: "Configure Licensing",
      done: pricingConfigured,
    },
    {
      key: "stripe" as const,
      label: "Connect Stripe to get paid",
      description: "Link your Stripe account to receive payments directly.",
      cta: "Connect Stripe",
      done: stripeConnected,
    },
    {
      key: "share" as const,
      label: "Share your licensing page",
      description: "Your public storefront is live. Share it with buyers and AI companies.",
      cta: "Copy Link",
      done: shareComplete,
    },
  ] as const;

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const pct = (completedCount / steps.length) * 100;

  const handleConnectStripe = async () => {
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
      } else {
        throw new Error(result.error || "Failed to start Stripe onboarding");
      }
    } catch (err) {
      toast({
        title: "Stripe Connect Failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsStripeConnecting(false);
    }
  };

  const handleCopyLink = async () => {
    const url = publisherSlug ? `https://opedd.com/p/${publisherSlug}` : "https://opedd.com/p/";
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  // Permanently hide once setup_complete=true
  if (setupComplete) return null;

  // "You're all set!" banner — shown when all 4 steps are done, dismiss per session
  if (allDone) {
    if (sessionDismissed) return null;
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <PartyPopper size={24} className="text-emerald-500 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-base font-bold text-[#111827]">You're all set!</h3>
            <p className="text-sm text-[#6B7280] mt-0.5">Your licensing page is live and ready to earn.</p>
          </div>
          <button
            onClick={() => {
            localStorage.setItem("opedd_checklist_dismissed", "true");
            setSessionDismissed(true);
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
      <div className="mb-4">
        <h3 className="text-base font-bold text-[#111827]">Get started with Opedd</h3>
        <p className="text-sm text-[#6B7280] mt-0.5">{completedCount} of {steps.length} steps complete</p>
      </div>

      <Progress value={pct} className="h-2 mb-5 bg-[#F3F4F6] [&>div]:bg-[#4A26ED]" />

      <ul className="space-y-1">
        {steps.map((step) => (
          <li key={step.key}>
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                step.done ? "bg-transparent" : "hover:bg-[#F9FAFB]"
              }`}
            >
              {step.done ? (
                <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle size={20} className="text-[#D1D5DB] flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <span className={`text-sm block ${step.done ? "text-[#9CA3AF] line-through" : "text-[#111827] font-medium"}`}>
                  {step.label}
                </span>
                {!step.done && (
                  <span className="text-xs text-[#9CA3AF]">{step.description}</span>
                )}
              </div>

              {!step.done && (
                <>
                  {step.key === "content" && (
                    <Button
                      size="sm"
                      onClick={() => onRegisterContent ? onRegisterContent() : navigate("/content")}
                      className="h-8 px-3 text-xs bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold rounded-lg flex-shrink-0"
                    >
                      {step.cta}<ArrowRight size={12} className="ml-1" />
                    </Button>
                  )}

                  {step.key === "pricing" && (
                    <Button
                      size="sm"
                      onClick={() => navigate("/licensing")}
                      className="h-8 px-3 text-xs bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold rounded-lg flex-shrink-0"
                    >
                      {step.cta}<ArrowRight size={12} className="ml-1" />
                    </Button>
                  )}

                  {step.key === "stripe" && (
                    <Button
                      size="sm"
                      onClick={handleConnectStripe}
                      disabled={isStripeConnecting}
                      className="h-8 px-3 text-xs bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold rounded-lg flex-shrink-0"
                    >
                      {isStripeConnecting ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <>{step.cta}<ArrowRight size={12} className="ml-1" /></>
                      )}
                    </Button>
                  )}

                  {step.key === "share" && (
                    <Button
                      size="sm"
                      onClick={handleCopyLink}
                      disabled={!shareComplete}
                      className="h-8 px-3 text-xs bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold rounded-lg flex-shrink-0"
                    >
                      {linkCopied ? (
                        <><Check size={12} className="mr-1" />Copied!</>
                      ) : (
                        <><Copy size={12} className="mr-1" />{step.cta}</>
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
