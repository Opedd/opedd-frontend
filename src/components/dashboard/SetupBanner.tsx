import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as Sentry from "@sentry/react";
import {
  AlertTriangle,
  Clock,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { useWizardState } from "@/hooks/useWizardState";
import type { SetupState } from "@/lib/api";

/**
 * Phase 1 Session 1.8 — SetupBanner refactor (KNOWN_ISSUES #23 closure).
 *
 * Reads truthful publisher state from useWizardState (Session 1.3 hook,
 * which wraps the wizard-state edge function). Replaces the previous
 * hardcoded `verified=true` lie that the original component carried as
 * dead code.
 *
 * Mounted at the top of Dashboard.tsx's content area, above all other
 * banners. Visible whenever setup_state ∈ {prospect, in_setup, connected,
 * suspended}; returns null for verified (the celebration moment is owned
 * by Welcome.tsx — Session 1.9 scope).
 *
 * v1 omits dismiss state. Trade-off: in_setup publishers see Resume setup
 * CTA on every dashboard load. If post-launch feedback indicates fatigue,
 * add localStorage dismiss state then.
 *
 * Three null-return conditions exist; only one is silent:
 *   - verified state              → expected, no signal needed
 *   - useWizardState.isLoading    → expected, suppresses banner flash
 *   - useWizardState.error        → silent failure, Sentry breadcrumb fires
 */

interface BannerVariant {
  bg: string;
  iconColor: string;
  Icon: LucideIcon;
}

const VARIANT_AMBER: BannerVariant = {
  bg: "bg-amber-50 border-amber-200 text-amber-900",
  iconColor: "text-amber-500",
  Icon: AlertTriangle,
};
const VARIANT_INFO: BannerVariant = {
  bg: "bg-blue-50 border-blue-200 text-blue-900",
  iconColor: "text-blue-500",
  Icon: Clock,
};
const VARIANT_DANGER: BannerVariant = {
  bg: "bg-red-50 border-red-200 text-red-900",
  iconColor: "text-red-500",
  Icon: Mail,
};

interface BannerContent {
  title: string;
  variant: BannerVariant;
  cta?: { label: string; onClick: () => void };
}

function buildContent(
  setupState: SetupState,
  setupStep: number | null,
  navigate: (path: string) => void,
): BannerContent | null {
  switch (setupState) {
    case "prospect":
      return {
        title: "Get started — set up your publication to begin licensing.",
        variant: VARIANT_AMBER,
        cta: { label: "Get started", onClick: () => navigate("/setup-v2") },
      };
    case "in_setup": {
      const step = setupStep && setupStep >= 1 && setupStep <= 5 ? setupStep : 1;
      return {
        title: `Setup in progress — step ${step} of 5.`,
        variant: VARIANT_AMBER,
        cta: { label: "Resume setup", onClick: () => navigate("/setup-v2") },
      };
    }
    case "connected":
      // Phase 4.7.4 (OQ.2): "Review pending — typically <24h" copy removed per
      // trust-from-day-1 soft-launch posture (2026-04-29). No admin review queue
      // exists; banner stays out for connected state, mirroring verified pattern.
      // PublicationCard's verification badge conveys actual marketplace state.
      return null;
    case "verified":
      // Celebration moment owned by Welcome.tsx (Session 1.9). Banner stays out.
      return null;
    case "suspended":
      return {
        title: "Verification temporarily suspended. Contact support for details.",
        variant: VARIANT_DANGER,
        cta: {
          label: "Contact support",
          onClick: () => {
            window.location.href = "mailto:support@opedd.com?subject=Verification%20suspended";
          },
        },
      };
    default: {
      // Unknown state — schema drift. Don't crash; breadcrumb + null.
      Sentry.addBreadcrumb({
        category: "setup-banner",
        level: "warning",
        message: "Unknown setup_state; rendering null",
        data: { setup_state: String(setupState).slice(0, 64) },
      });
      return null;
    }
  }
}

export function SetupBanner() {
  const navigate = useNavigate();
  const { setupState, currentStep, isLoading, error } = useWizardState();
  const errorBreadcrumbFiredRef = useRef(false);

  useEffect(() => {
    if (error && !errorBreadcrumbFiredRef.current) {
      errorBreadcrumbFiredRef.current = true;
      Sentry.addBreadcrumb({
        category: "setup-banner",
        level: "warning",
        message: "useWizardState error; rendering null (silent failure)",
        data: { code: error.code ?? "unknown", status: error.status ?? "unknown" },
      });
    }
    if (!error) {
      errorBreadcrumbFiredRef.current = false;
    }
  }, [error]);

  if (isLoading || error || !setupState) return null;

  const content = buildContent(setupState, currentStep, navigate);
  if (!content) return null;

  const { Icon, bg, iconColor } = content.variant;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center ${bg}`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Icon size={18} className={`mt-0.5 shrink-0 ${iconColor}`} aria-hidden />
        <p className="text-sm font-medium leading-snug">{content.title}</p>
      </div>
      {content.cta && (
        <button
          type="button"
          onClick={content.cta.onClick}
          className="self-start sm:self-auto shrink-0 rounded-lg border border-current/20 bg-white/60 px-3 py-1.5 text-xs font-medium hover:bg-white transition-colors"
        >
          {content.cta.label}
        </button>
      )}
    </div>
  );
}

// Internal export for testing — pure copy mapping without React Query mocking.
export const _internal = { buildContent, VARIANT_AMBER, VARIANT_INFO, VARIANT_DANGER };
