import { ResumeIntentCapture } from "./ResumeIntentCapture";
import type { PlatformId } from "./Step1Platform";

/**
 * Phase 3 Session 3.1 — Step 2 stub for ALL 5 platforms.
 *
 * Substack-specific real implementation (URL + email_to_publication
 * verification) is held back to Session 3.3 because the verify-
 * ownership pre-flight probe surfaced a Resend delivery bug that
 * blocks any send to non-account-owner addresses (see KNOWN_ISSUES
 * "Resend sandbox sender restriction").
 *
 * Per Founder Decision Z (2026-04-27): ship loop-fix in 3.1 with
 * all-platforms stubbed. Re-enable the Substack functional path in
 * 3.3 after Resend is fixed (verify opedd.com domain in Resend +
 * set EMAIL_FROM env). Probe re-runs as a Session 3.3 precondition.
 *
 * Each platform shows its own honest copy via ResumeIntentCapture.
 * Email captures into setup_data.wizard_resume_intent.step2-{platform}
 * so the founder can email the captured publishers when each platform
 * ships.
 */

interface Step2StubProps {
  platform: PlatformId | null;
}

interface PlatformCopy {
  title: string;
  message: string;
}

const PLATFORM_COPY: Record<PlatformId, PlatformCopy> = {
  substack: {
    title: "Connecting your Substack",
    message:
      "We're rebuilding the Substack onboarding flow — RSS import, email verification, and the archive ZIP upload all in one path. Your account is reserved and we'll email you the moment Substack onboarding ships.",
  },
  beehiiv: {
    title: "Connecting your Beehiiv",
    message:
      "Beehiiv onboarding is coming next — we're prioritizing Substack first. Your account is reserved and we'll email you the moment Beehiiv is ready.",
  },
  ghost: {
    title: "Connecting your Ghost site",
    message:
      "Ghost onboarding is coming after Substack — both Ghost(Pro) and self-hosted will be supported. Your account is reserved and we'll email you the moment Ghost is ready.",
  },
  wordpress: {
    title: "Connecting your WordPress site",
    message:
      "WordPress onboarding is on the roadmap with Application Password authentication and a screenshot walkthrough. Your account is reserved and we'll email you the moment WordPress is ready.",
  },
  custom: {
    title: "Connecting your custom site",
    message:
      "Custom and headless CMS onboarding is being built — API-key, RSS, sitemap, and manual-review paths all in one flow. Your account is reserved and we'll email you the moment Custom is ready.",
  },
};

const FALLBACK: PlatformCopy = {
  title: "Connecting your platform",
  message:
    "We're rebuilding this flow. Your account is reserved and we'll email you the moment it's ready.",
};

export function Step2Stub({ platform }: Step2StubProps) {
  const copy = platform ? PLATFORM_COPY[platform] : FALLBACK;
  const stepLabel = platform ? `step2-${platform}` : "step2-unknown";
  return (
    <ResumeIntentCapture
      stepLabel={stepLabel}
      title={copy.title}
      message={copy.message}
    />
  );
}
