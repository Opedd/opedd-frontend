import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Spinner } from "@/components/ui/Spinner";
import { useWizardState } from "@/hooks/useWizardState";
import { Step1Platform, type PlatformId } from "@/components/setup-v2/Step1Platform";
import { Step2Stub } from "@/components/setup-v2/Step2Stub";
import { Step2Substack } from "@/components/setup-v2/Step2Substack";
import { Step4Categorize } from "@/components/setup-v2/Step4Categorize";
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
  const [searchParams] = useSearchParams();
  const isAddSource = searchParams.get("add") === "1";

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

  // ─── ?add=1 path (Dashboard "add another source" buttons) ──────
  // Out of scope for SetupV2 v1 — render a stub with email capture.
  // Only meaningful for already-onboarded publishers; for prospect
  // users we ignore the param and fall through to normal flow.
  if (isAddSource && wizard.setupState !== "prospect") {
    return (
      <ResumeIntentCapture
        stepLabel="add-additional-sources"
        title="Adding additional sources"
        message="Adding more publications to your existing account is coming in Phase 4. Your existing setup is unaffected — we'll email you when it's ready."
      />
    );
  }

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
      return (
        <ResumeIntentCapture
          stepLabel="step3-model-perception"
          title="Model Perception preview"
          message="This step shows you what an LLM sees when buyers query your archive — title, body, named entities, expert authority claims, structured taxonomies. We're building the enrichment pipeline now; your archive is being indexed in the background and will be ready when this step ships."
        />
      );
    case 4:
      // Phase 3 Session 3.4 — Step 4 functional. Replaces the
      // ResumeIntentCapture stub from Session 3.1.
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
