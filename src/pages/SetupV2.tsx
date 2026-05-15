import { useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Spinner } from "@/components/ui/Spinner";
import { useWizardState } from "@/hooks/useWizardState";
import { Step1Platform, type PlatformId } from "@/components/setup-v2/Step1Platform";
import { Step2Substack } from "@/components/setup-v2/Step2Substack";
import { Step2Beehiiv } from "@/components/setup-v2/Step2Beehiiv";
import { Step2Ghost } from "@/components/setup-v2/Step2Ghost";
import { Step2Api } from "@/components/setup-v2/Step2Api";
import { Step4Categorize } from "@/components/setup-v2/Step4Categorize";
import { Step5Stripe } from "@/components/setup-v2/Step5Stripe";
import { WowMomentStep } from "@/components/setup-v2/WowMomentStep";
import { TerminalState } from "@/components/setup-v2/TerminalState";

// Phase 11 M7.1 — add-newsletter mode. Verified publishers re-enter the
// wizard via Dashboard "+ Add another newsletter" deep-link. URL shape:
// /setup-v2?mode=add-newsletter&platform=<beehiiv|ghost|substack>.
// SetupV2 in this mode (a) bypasses the verified-publisher redirect,
// (b) skips Step1 platform selection (already supplied via ?platform=),
// (c) renders Step2<Platform> with onCompletionRedirect prop, and (d) on
// completion navigates to /dashboard?added_newsletter=1 (Dashboard reads
// this and surfaces a toast).
const ADD_NEWSLETTER_PLATFORMS = ["beehiiv", "ghost", "substack"] as const;
type AddNewsletterPlatform = (typeof ADD_NEWSLETTER_PLATFORMS)[number];

function isAddNewsletterPlatform(value: string | null): value is AddNewsletterPlatform {
  return value !== null && (ADD_NEWSLETTER_PLATFORMS as readonly string[]).includes(value);
}

/**
 * Phase 3 Session 3.1 — SetupV2 wizard orchestrator.
 *
 * State-driven routing over (setup_state, setup_step) read from
 * useWizardState (Session 1.3 hook → wizard-state edge function from
 * Session 1.2). Replaces legacy Setup.tsx — App.tsx redirects /setup
 * to /setup-v2 in the same commit so no real publisher can hit the
 * legacy infinite loop (SetupBanner read setup_state, legacy Setup.tsx
 * never wrote it; see docs/proposals/phase-3-implementation-roadmap.md
 * §"Why Phase 3 exists right now").
 *
 * Loop-fix discipline: this component writes setup_state via every
 * advance — wizard-state's CAS UPDATE flips both setup_state AND
 * setup_complete in lockstep per the migration 066 invariant.
 *
 * Session 3.1 ships Step 1 functional + Steps 2-5 honest stubs (per
 * Founder Decision Z 2026-04-27). Step 2 Substack functional path
 * waits for Session 3.3 once the verify-ownership pre-flight Resend
 * bug is fixed. Steps 3 / 4 / 5 wait for their respective sessions.
 *
 * Stubs capture email-me-when-ready intent into
 * setup_data.wizard_resume_intent.{stepLabel} so the founder can
 * email captured publishers as each step ships.
 */

export default function SetupV2() {
  const wizard = useWizardState();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Phase 11 M7.1 — add-newsletter mode detection.
  const addNewsletterMode = searchParams.get("mode") === "add-newsletter";
  const queryPlatform = searchParams.get("platform");
  const addNewsletterPlatform: AddNewsletterPlatform | null =
    addNewsletterMode && isAddNewsletterPlatform(queryPlatform) ? queryPlatform : null;

  const handleAddNewsletterComplete = useCallback(() => {
    navigate("/dashboard?added_newsletter=1", { replace: true });
  }, [navigate]);

  // Verified publishers don't belong on the wizard — unless they are
  // re-entering via the add-newsletter deep-link (Phase 11 M7.1).
  useEffect(() => {
    if (wizard.setupState === "verified" && !addNewsletterPlatform) {
      navigate("/dashboard", { replace: true });
    }
  }, [wizard.setupState, navigate, addNewsletterPlatform]);

  // ─── Loading + error gates ─────────────────────────────────────
  if (wizard.isLoading) return <FullPageSpinner />;
  if (wizard.error && !wizard.state) {
    return <ErrorView message={wizard.error.message} />;
  }
  if (!wizard.state) return <FullPageSpinner />;

  // ─── Phase 11 M7.1 — add-newsletter mode dispatch ──────────────
  // Verified publisher + valid query string → render Step2<Platform>
  // directly with onCompletionRedirect. Bypasses Step1 (platform
  // pre-selected) + Step3 WowMoment (already seen).
  if (addNewsletterPlatform && wizard.setupState === "verified") {
    if (addNewsletterPlatform === "substack") {
      return <Step2Substack onCompletionRedirect={handleAddNewsletterComplete} />;
    }
    if (addNewsletterPlatform === "beehiiv") {
      return <Step2Beehiiv onCompletionRedirect={handleAddNewsletterComplete} />;
    }
    return <Step2Ghost onCompletionRedirect={handleAddNewsletterComplete} />;
  }
  // Invalid add-newsletter query (mode=add-newsletter but bad/missing
  // platform OR publisher not yet verified) — fall through to normal
  // wizard dispatch silently. Bad UX but defensive.

  // Phase 4.7.2 (2026-04-30): the legacy `?add=1` branch was removed
  // per OQ.3 (no add-source flow in v1). `/setup-v2?add=1` URLs now
  // fall through to the regular state-driven dispatch silently.
  // Closes KI #58 + #59 alongside PlatformConnectModal deletion.

  // ─── Terminal states ───────────────────────────────────────────
  if (wizard.setupState === "verified") {
    // useEffect handles the navigation; render nothing this tick.
    return null;
  }
  if (wizard.setupState === "connected") {
    return <TerminalState state="connected" />;
  }
  if (wizard.setupState === "suspended") {
    return <TerminalState state="suspended" />;
  }

  // ─── prospect → render Step 1 picker ───────────────────────────
  if (wizard.setupState === "prospect") {
    return <Step1Platform />;
  }

  // ─── in_setup → render correct step component ──────────────────
  const platform = (wizard.setupData.platform as PlatformId | undefined) ?? null;
  switch (wizard.currentStep) {
    case 1:
      return <Step1Platform />;
    case 2:
      // 4 canonical platforms: substack, beehiiv (platform_native_api
      // direct-flip), ghost (sibling carve-out), api (Phase 8 canonical
      // Publisher API: publishers-api-keys + publishers-content +
      // publishers-webhooks).
      if (platform === "substack") {
        return <Step2Substack />;
      }
      if (platform === "beehiiv") {
        return <Step2Beehiiv />;
      }
      if (platform === "ghost") {
        return <Step2Ghost />;
      }
      if (platform === "api") {
        return <Step2Api />;
      }
      // Unknown/legacy platform value — fall back to Step1 picker.
      return <Step1Platform />;
    case 3:
      // Phase 11 M1.c (2026-05-14) — WowMomentStep replaces the prior
      // ResumeIntentCapture("Model Perception preview") placeholder
      // (Phase 4.6 dead-end fix; Phase 2 enrichment-pipeline-paused
      // stub). Article-to-AI-format transformation animation feeds off
      // the M1.b inline first-batch fetch (Beehiiv/Ghost/Substack) OR
      // a static sample (Custom API). Replaces dormant placeholder
      // surface per founder Correction 5 + Adjustment 1 ratification.
      return <WowMomentStep />;
    case 4:
      // Phase 5 Session 5.1 (2026-04-30) — Step4Categorize re-dispatched.
      // Vocabulary unification closed KI #54 + KI #56: backend
      // allowlist now accepts the canonical 4-type vocab
      // {human_per_article, human_full_archive, ai_retrieval, ai_training};
      // Step4Categorize.tsx writes the new vocab. Pre-Phase-5.1 stub
      // (Phase 4.6 commit γ) replaced this case with ResumeIntentCapture
      // because the writer/allowlist mismatch (KI #54) caused every PATCH
      // to 400; skip-path was the workaround. Mismatch fixed in 5.1.
      return <Step4Categorize />;
    case 5:
      // Phase 3 Session 3.5 — Step 5 functional. Replaces the
      // ResumeIntentCapture stub from Session 3.1.
      return <Step5Stripe />;
    default:
      return (
        <ErrorView
          message={`Unexpected wizard step: ${wizard.currentStep}. Please reload, or contact support if the issue persists.`}
        />
      );
  }
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-alice-gray flex items-center justify-center">
      <Spinner size="lg" className="text-oxford" />
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-alice-gray flex items-center justify-center px-6 py-16">
      <div
        role="alert"
        className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center"
      >
        <h1 className="text-xl font-semibold text-red-900 mb-3">
          Something went wrong
        </h1>
        <p className="text-gray-600 mb-6">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-navy-deep text-white font-medium px-6 py-3 rounded-lg hover:bg-oxford transition"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
