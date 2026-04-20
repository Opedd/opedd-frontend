import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Circle, ArrowRight, PartyPopper, Loader2, Copy, Check, Info,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

interface Props {
  contentImported: boolean;
  aiLicensingConfigured: boolean;
  pricingConfigured: boolean;
  stripeConnected: boolean;
  setupComplete: boolean;
  publisherSlug: string | null;
  initialAiLicenseTypes?: { rag: boolean; training: boolean; inference: boolean } | null;
  onRegisterContent?: () => void;
  onAiLicensingComplete?: () => void;
}

export function OnboardingChecklist({
  contentImported,
  aiLicensingConfigured,
  pricingConfigured,
  stripeConnected,
  setupComplete,
  publisherSlug,
  initialAiLicenseTypes,
  onRegisterContent,
  onAiLicensingComplete,
}: Props) {
  const navigate = useNavigate();
  const { getAccessToken } = useAuth();
  const { toast } = useToast();

  const [isStripeConnecting, setIsStripeConnecting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState(
    () => localStorage.getItem("opedd_checklist_dismissed") === "true"
  );

  // AI Licensing inline toggles
  const [aiToggles, setAiToggles] = useState({
    rag: initialAiLicenseTypes?.rag ?? true,
    training: initialAiLicenseTypes?.training ?? true,
    inference: initialAiLicenseTypes?.inference ?? true,
  });
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [aiLicensingDone, setAiLicensingDone] = useState(aiLicensingConfigured);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  // Step 4 completes automatically when steps 1–4 are all done
  const shareComplete = contentImported && aiLicensingDone && pricingConfigured && stripeConnected;

  const steps = [
    {
      key: "content" as const,
      label: "Import your content",
      description: "Import your content to populate your catalog.",
      cta: "Import Content",
      done: contentImported,
    },
    {
      key: "ai-licensing" as const,
      label: "Enable AI Licensing",
      description: "Your content is eligible to be licensed to AI labs and research teams. Opedd handles the enterprise contracts — you just collect monthly revenue.",
      cta: "Configure",
      done: aiLicensingDone,
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

  const handleSaveAiLicensing = async () => {
    setIsSavingAi(true);
    try {
      const token = await getAccessToken();
      // Canonical format: write to pricing_rules.license_types.
      // Map the legacy rag/training/inference toggles to the new license type keys.
      const licenseTypes: Record<string, { enabled: boolean }> = {};
      if (aiToggles.rag) licenseTypes.ai_retrieval = { enabled: true };
      if (aiToggles.training) licenseTypes.ai_training = { enabled: true };
      if (aiToggles.inference) licenseTypes.syndication = { enabled: true };
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "PATCH",
        headers: {
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pricing_rules: { license_types: licenseTypes } }),
      });
      const result = await res.json();
      if (result.success) {
        setAiLicensingDone(true);
        setExpandedStep(null);
        toast({ title: "AI licensing preferences saved." });
        onAiLicensingComplete?.();
      } else {
        throw new Error(result.error?.message || "Save failed");
      }
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSavingAi(false);
    }
  };

  // Permanently hide once setup_complete=true
  if (setupComplete) return null;

  // "You're all set!" banner
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

  const aiToggleRows = [
    { key: "rag" as const, label: "RAG / Retrieval", desc: "AI systems can retrieve and cite your articles in real-time. Highest volume use case." },
    { key: "training" as const, label: "Model Training", desc: "Your content can be used to train or fine-tune AI language models." },
    { key: "inference" as const, label: "Inference / Summarization", desc: "AI products can summarize your articles for end users." },
  ];

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
                {!step.done && step.key !== "ai-licensing" && (
                  <span className="text-xs text-[#9CA3AF]">{step.description}</span>
                )}
                {!step.done && step.key === "ai-licensing" && expandedStep !== "ai-licensing" && (
                  <span className="text-xs text-[#9CA3AF]">{step.description}</span>
                )}
              </div>

              {!step.done && (
                <>
                  {step.key === "content" && (
                    <Button
                      size="sm"
                      onClick={() => onRegisterContent ? onRegisterContent() : navigate("/content")}
                      className="h-9 px-3 text-xs bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold rounded-lg flex-shrink-0"
                    >
                      {step.cta}<ArrowRight size={12} className="ml-1" />
                    </Button>
                  )}

                  {step.key === "ai-licensing" && expandedStep !== "ai-licensing" && (
                    <Button
                      size="sm"
                      onClick={() => setExpandedStep("ai-licensing")}
                      className="h-9 px-3 text-xs bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold rounded-lg flex-shrink-0"
                    >
                      {step.cta}<ArrowRight size={12} className="ml-1" />
                    </Button>
                  )}

                  {step.key === "pricing" && (
                    <Button
                      size="sm"
                      onClick={() => navigate("/licensing")}
                      className="h-9 px-3 text-xs bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold rounded-lg flex-shrink-0"
                    >
                      {step.cta}<ArrowRight size={12} className="ml-1" />
                    </Button>
                  )}

                  {step.key === "stripe" && (
                    <Button
                      size="sm"
                      onClick={handleConnectStripe}
                      disabled={isStripeConnecting}
                      className="h-9 px-3 text-xs bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold rounded-lg flex-shrink-0"
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
                      className="h-9 px-3 text-xs bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold rounded-lg flex-shrink-0"
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

            {/* Expanded AI Licensing inline card */}
            {step.key === "ai-licensing" && !step.done && expandedStep === "ai-licensing" && (
              <div className="ml-11 mr-3 mt-2 mb-3 rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-5 space-y-4">
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  {step.description}
                </p>

                <div className="space-y-3">
                  {aiToggleRows.map((row) => (
                    <div key={row.key} className="flex items-start justify-between gap-3 py-2 border-b border-[#F3F4F6] last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#040042]">{row.label}</p>
                        <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">{row.desc}</p>
                      </div>
                      <Switch
                        checked={aiToggles[row.key]}
                        onCheckedChange={(checked) => setAiToggles(prev => ({ ...prev, [row.key]: checked }))}
                        className="mt-0.5 shrink-0"
                      />
                    </div>
                  ))}
                </div>

                {/* Info callout */}
                <div className="flex items-start gap-2.5 rounded-lg bg-[#EEF0FD] p-3">
                  <Info size={15} className="text-[#4A26ED] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#4A26ED]/80 leading-relaxed">
                    We recommend keeping all three enabled. AI licensing is how independent publishers generate passive revenue from their back catalog — with no extra work on your end. Opedd disburses your share automatically every month.
                  </p>
                </div>

                <p className="text-xs text-[#9CA3AF]">
                  Not sure? You can change these anytime in{" "}
                  <button onClick={() => navigate("/settings?tab=ai-licensing")} className="underline hover:text-[#6B7280] transition-colors">
                    Settings → AI Licensing
                  </button>.
                </p>

                <Button
                  onClick={handleSaveAiLicensing}
                  disabled={isSavingAi}
                  className="w-full bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold rounded-lg"
                >
                  {isSavingAi ? <><Loader2 size={14} className="mr-2 animate-spin" />Saving...</> : "Save & Continue"}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
