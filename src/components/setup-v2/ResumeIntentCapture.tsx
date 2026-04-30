import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWizardState } from "@/hooks/useWizardState";

/**
 * Phase 3 Session 3.1 — shared "stub" UI for unbuilt wizard steps.
 *
 * Honest copy: "this step is being rebuilt, your account is reserved,
 * we'll email you when it ships". Captures email-me-when-ready intent
 * into setup_data.wizard_resume_intent.{stepLabel} via wizard-state's
 * save_step_data action.
 *
 * Why namespaced under one key: wizard-state's setup_data merge is
 * shallow at the top level — writing { wizard_resume_intent: { ... } }
 * REPLACES any existing wizard_resume_intent. Caller-side merge below
 * preserves entries from sibling stubs (Step3 capture won't clobber
 * Step4 capture).
 *
 * Used by Step2Stub for non-Substack platforms in v1, and directly by
 * SetupV2 for Steps 3 / 4 / 5 (those don't need their own files in v1
 * — they share this component with step-specific copy passed as props).
 *
 * Phase 4.6 (2026-04-30) — added `allowAdvance` prop for the Step 3
 * Model Perception preview placeholder dead-end fix (closes KI #53 +
 * unblocks Phase 4.5 frontend live-flow gate). Set true ONLY for
 * genuinely-skippable placeholder steps. Step 3 is the only v1
 * consumer; Step2Stub for Beehiiv/Ghost/WordPress/Custom remains
 * non-skippable because those are platform-specific flows that
 * publishers genuinely cannot bypass.
 */

interface ResumeIntent {
  email: string;
  captured_at: string;
}

type ResumeIntentMap = Record<string, ResumeIntent>;

interface ResumeIntentCaptureProps {
  stepLabel: string;
  title: string;
  message: string;
  /**
   * When true, render a "Skip for now" CTA below the email-capture
   * form that calls wizard.advance({}) — closes the dead-end for
   * placeholder steps that publishers should be able to bypass while
   * the real implementation ships. Default false: non-skippable
   * placeholders (Step2Stub for unbuilt platforms) remain blocked.
   */
  allowAdvance?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ResumeIntentCapture({
  stepLabel,
  title,
  message,
  allowAdvance = false,
}: ResumeIntentCaptureProps) {
  const wizard = useWizardState();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);

  const existing = (wizard.setupData.wizard_resume_intent ?? {}) as ResumeIntentMap;
  const alreadyCaptured = !!existing[stepLabel];

  const isValid = EMAIL_RE.test(email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await wizard.saveStepData({
        wizard_resume_intent: {
          ...existing,
          [stepLabel]: {
            email: email.trim().toLowerCase(),
            captured_at: new Date().toISOString(),
          },
        },
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to save — please try again",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (skipping || submitting || wizard.isMutating) return;
    setSkipping(true);
    setSubmitError(null);
    try {
      await wizard.advance({});
      // SetupV2 routing re-renders to next step on the next paint;
      // this component unmounts before the spinner resolves.
    } catch (err) {
      setSkipping(false);
      setSubmitError(
        err instanceof Error ? err.message : "Couldn't skip — please try again",
      );
    }
  };

  const showCapture = !alreadyCaptured && !submitted;

  return (
    <div className="min-h-screen bg-alice-gray flex items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10">
          <h1 className="text-2xl font-semibold text-navy-deep mb-3">{title}</h1>
          <p className="text-gray-600 leading-relaxed mb-6">{message}</p>

          {showCapture ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <label
                htmlFor={`resume-email-${stepLabel}`}
                className="block text-sm font-medium text-gray-700"
              >
                Email me when this step ships
              </label>
              <Input
                id={`resume-email-${stepLabel}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="you@yourpublication.com"
                disabled={submitting}
                required
                aria-invalid={touched && !isValid}
              />
              {touched && !isValid && (
                <p className="text-sm text-red-600">
                  Enter a valid email address.
                </p>
              )}
              {submitError && (
                <p className="text-sm text-red-600">{submitError}</p>
              )}
              <Button
                type="submit"
                disabled={!isValid || submitting}
                className="w-full"
              >
                {submitting ? "Saving…" : "Email me when ready"}
              </Button>
            </form>
          ) : (
            <div
              role="status"
              className="bg-green-50 border border-green-200 text-green-900 rounded-lg p-4"
            >
              <p className="font-medium">
                ✓ We'll email you when this is ready.
              </p>
              <p className="text-sm text-green-700 mt-1">
                Captured: {existing[stepLabel]?.email ?? email.trim()}
              </p>
            </div>
          )}

          {allowAdvance && (
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                disabled={skipping || submitting || wizard.isMutating}
                className="w-full"
              >
                {skipping ? "Skipping…" : "Skip for now"}
              </Button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100">
            <Link
              to="/dashboard"
              className="text-sm text-navy-deep hover:text-oxford font-medium"
            >
              ← Back to dashboard
            </Link>
            <p className="text-xs text-gray-400 mt-2">
              Your progress is saved. You can come back any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
