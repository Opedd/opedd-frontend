import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/Spinner";
import { useWizardState } from "@/hooks/useWizardState";
import { Step1Platform, type PlatformId } from "@/components/setup-v2/Step1Platform";
import { Step2Stub } from "@/components/setup-v2/Step2Stub";
import { Step2Substack } from "@/components/setup-v2/Step2Substack";
import { Step5Stripe } from "@/components/setup-v2/Step5Stripe";
import { ResumeIntentCapture } from "@/components/setup-v2/ResumeIntentCapture";
import { TerminalState } from "@/components/setup-v2/TerminalState";

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

  // Verified publishers don't belong on the wizard. Redirect quietly.
  useEffect(() => {
    if (wizard.setupState === "verified") {
      navigate("/dashboard", { replace: true });
    }
  }, [wizard.setupState, navigate]);

  // ─── Loading + error gates ─────────────────────────────────────
  if (wizard.isLoading) return <FullPageSpinner />;
  if (wizard.error && !wizard.state) {
    return <ErrorView message={wizard.error.message} />;
  }
  if (!wizard.state) return <FullPageSpinner />;

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
      // Phase 3 Session 3.3 — Substack functional. Other platforms
      // remain stubbed (each ships in its dedicated phase per the
      // roadmap: Beehiiv P6, Ghost P7, WordPress P8, Custom P9).
      if (platform === "substack") {
        return <Step2Substack />;
      }
      return <Step2Stub platform={platform} />;
    case 3:
      // Phase 4.6 (2026-04-30) — allowAdvance={true} closes the
      // dead-end that blocked publishers from reaching Step 4 + 5
      // + Dashboard. Step 3 Model Perception preview is a
      // deliberately-deferred placeholder (Phase 2 enriched-indexing
      // pipeline paused); skip path lets publishers complete
      // onboarding while the real implementation ships. Closes
      // KI #53 + Phase 4.5 frontend live-flow gate deferral.
      return (
        <ResumeIntentCapture
          stepLabel="step3-model-perception"
          title="Model Perception preview"
          message="This step shows you what an LLM sees when buyers query your archive — title, body, named entities, expert authority claims, structured taxonomies. We're building the enrichment pipeline now; your archive is being indexed in the background and will be ready when this step ships."
          allowAdvance={true}
        />
      );
    case 4:
      // Phase 4.6 (2026-04-30) — Step 4 reverted to ResumeIntentCapture
      // stub pending Phase 5 Session 5.x license-type vocabulary fix.
      // Step 4 PATCH has been structurally broken since Phase 3 Session
      // 3.4 (2026-04-28): Step4Categorize writes pricing_rules.license_types
      // with key "human", but publisher-profile/index.ts:1574 allowlist
      // rejects "human" (accepts only editorial, archive, ai_retrieval,
      // ai_training, corporate, syndication). Probe 2026-04-30: zero
      // publishers ever persisted the "human" key — every Step 4 PATCH
      // returned 400. Skip path lets publishers complete onboarding
      // while the vocabulary mismatch is fixed in Phase 5. See KI #54 +
      // KI #56. Re-dispatch <Step4Categorize /> here once vocabulary is
      // aligned.
      return (
        <ResumeIntentCapture
          stepLabel="step4-categorize-and-price"
          title="Pricing setup — coming soon"
          message="We're rolling out an updated pricing system that gives you finer control over how your content is licensed for AI training, AI retrieval, and human research use. Skip for now to complete onboarding — we'll email you when pricing setup is ready, and you'll be able to set prices then."
          allowAdvance={true}
        />
      );
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
