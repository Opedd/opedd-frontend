import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useWizardState } from "@/hooks/useWizardState";
import { stripeApi } from "@/lib/api";
import { StripeDisabledReasonDisplay } from "./StripeDisabledReasonDisplay";

/**
 * Phase 3 Session 3.5 — Step 5 Stripe Connect (functional).
 *
 * Replaces the Session 3.1 stub (ResumeIntentCapture). Wires SetupV2
 * to the deployed publisher-profile {connect_stripe, stripe_status}
 * actions and the Stripe Express onboarding flow.
 *
 * Three-state UX driven by (stripe_account_id, stripe_onboarding_
 * complete, stripe_disabled_reason) read from publisher-profile GET:
 *   1. NOT CONNECTED (no stripe_account_id) → "Connect Stripe" CTA
 *      + skip path with v2 spec escrow framing copy.
 *   2. PARTIAL (account exists, onboarding incomplete) → render
 *      StripeDisabledReasonDisplay with parsed currently_due fields
 *      + "Resume Stripe setup" CTA + skip path.
 *   3. COMPLETE (stripe_onboarding_complete=true) → success state +
 *      explicit "Continue" button. NOT auto-advance (user
 *      confirmation before terminal navigation per design discipline).
 *
 * Skip path (NOT CONNECTED + PARTIAL only): wizard.advance({}) with
 * no Stripe API call. Per migration 066 transition table:
 * (in_setup, 5) advance produces (connected, 5) with setup_complete=
 * true. SetupV2 routing then renders TerminalState on next render.
 *
 * ?stripe=* redirect handling on mount:
 *   - success: call stripeApi.status() to force live Stripe API
 *     check (bridges webhook-lag gap), then refresh state.
 *   - refresh: same as success (publisher may have completed
 *     during link's lifetime even if it expired).
 *   - error: render error state with retry option (legacy handles
 *     this; preserve forward-compat).
 *
 * Phase 3 Session 3.5.0 probe validated the partial-state read
 * path end-to-end. The complete-state read path is deferred to
 * first real publisher per the documented green-state-flip gap.
 *
 * LOVABLE-POLISH (Phase 10 handoff):
 * - Parser output is verbose ("individual address city" instead of
 *   "address city"). Verbatim port from legacy per CLAUDE.md
 *   discipline; reword in Phase 10. (Detail in
 *   StripeDisabledReasonDisplay.tsx.)
 * - Escrow held-funds counter ("Ready to release immediately:
 *   $0.00") not implemented in v1. Add to NOT CONNECTED state copy
 *   block once accumulator query is wired.
 * - No state-transition animations. Static state changes.
 * - Continue button styling is utilitarian; brand polish pending.
 * - Error state from ?stripe=error path uses generic copy; Phase 10
 *   may want a Stripe-specific error taxonomy.
 */

type StripeRedirectParam = "success" | "refresh" | "error" | null;

interface StripeProfileSlice {
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_disabled_reason: string | null;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; profile: StripeProfileSlice }
  | { kind: "error"; message: string };

const PROFILE_URL =
  (import.meta as unknown as { env: { VITE_SUPABASE_URL?: string } }).env
    .VITE_SUPABASE_URL ?? "https://api.opedd.com";

/** Read the stripe slice from publisher-profile GET. */
async function fetchStripeSlice(
  token: string | null,
): Promise<StripeProfileSlice> {
  const res = await fetch(`${PROFILE_URL}/publisher-profile`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`publisher-profile GET ${res.status}`);
  }
  const body = await res.json();
  const data = body?.data ?? body ?? {};
  return {
    stripe_account_id:
      typeof data.stripe_account_id === "string" ? data.stripe_account_id : null,
    stripe_onboarding_complete: !!data.stripe_onboarding_complete,
    stripe_disabled_reason:
      typeof data.stripe_disabled_reason === "string"
        ? data.stripe_disabled_reason
        : null,
  };
}

function deriveState(
  profile: StripeProfileSlice,
): "not-connected" | "partial" | "complete" {
  if (!profile.stripe_account_id) return "not-connected";
  if (profile.stripe_onboarding_complete) return "complete";
  return "partial";
}

export function Step5Stripe() {
  const wizard = useWizardState();
  const { getAccessToken } = useAuth();
  const [searchParams] = useSearchParams();
  const stripeParam = searchParams.get("stripe") as StripeRedirectParam;

  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [busy, setBusy] = useState<"connect" | "skip" | "advance" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const refreshFromProfile = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const profile = await fetchStripeSlice(token);
      setLoadState({ kind: "ready", profile });
    } catch (err) {
      Sentry.addBreadcrumb({
        category: "step5-stripe",
        level: "warning",
        message: "publisher-profile fetch failed",
        data: { error: String(err).slice(0, 120) },
      });
      setLoadState({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to load Stripe state — please reload",
      });
    }
  }, [getAccessToken]);

  // Initial load + ?stripe=* redirect handling.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // ?stripe=success / refresh: force live Stripe state check via
      // stripeApi.status (bridges webhook-lag gap), then refresh
      // publisher-profile to read the synced state.
      if (stripeParam === "success" || stripeParam === "refresh") {
        try {
          const token = await getAccessToken();
          await stripeApi.status(token);
        } catch (err) {
          // stripe_status failure here is non-fatal — fall through to
          // the regular profile fetch which reads whatever the webhook
          // has had time to sync. Surface to Sentry for observability.
          Sentry.addBreadcrumb({
            category: "step5-stripe",
            level: "warning",
            message: "stripe_status post-redirect refresh failed",
            data: { error: String(err).slice(0, 120) },
          });
        }
      }
      if (cancelled) return;
      await refreshFromProfile();
    })();
    return () => {
      cancelled = true;
    };
  }, [stripeParam, getAccessToken, refreshFromProfile]);

  const handleConnect = useCallback(async () => {
    if (busy) return;
    setBusy("connect");
    setActionError(null);
    try {
      const token = await getAccessToken();
      const result = await stripeApi.connect("/setup-v2", token);
      window.location.href = result.onboarding_url;
    } catch (err) {
      setBusy(null);
      setActionError(
        err instanceof Error
          ? err.message
          : "Couldn't start Stripe setup — please try again",
      );
      Sentry.captureException(err, { tags: { component: "Step5Stripe" } });
    }
  }, [busy, getAccessToken]);

  const handleSkip = useCallback(async () => {
    if (busy) return;
    setBusy("skip");
    setActionError(null);
    try {
      await wizard.advance({});
      // SetupV2 routing re-renders to TerminalState on next paint.
    } catch (err) {
      setBusy(null);
      setActionError(
        err instanceof Error ? err.message : "Couldn't skip — please try again",
      );
    }
  }, [busy, wizard]);

  const handleContinue = useCallback(async () => {
    if (busy) return;
    setBusy("advance");
    setActionError(null);
    try {
      await wizard.advance({});
    } catch (err) {
      setBusy(null);
      setActionError(
        err instanceof Error
          ? err.message
          : "Couldn't continue — please try again",
      );
    }
  }, [busy, wizard]);

  // ─── Loading state ─────────────────────────────────────────────
  if (loadState.kind === "loading") {
    return (
      <div className="min-h-screen bg-alice-gray flex items-center justify-center">
        <Spinner size="lg" className="text-oxford" />
      </div>
    );
  }

  // ─── Error state (from ?stripe=error or fetch failure) ─────────
  if (loadState.kind === "error" || stripeParam === "error") {
    const msg =
      stripeParam === "error"
        ? "Stripe connection failed. Please try again."
        : loadState.kind === "error"
          ? loadState.message
          : "Stripe connection failed.";
    return (
      <div className="min-h-screen bg-alice-gray px-6 py-12">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center space-y-4">
            <h1 className="text-2xl font-semibold text-navy-deep">
              Stripe connection failed
            </h1>
            <p className="text-gray-600 leading-relaxed">{msg}</p>
            <Button
              type="button"
              onClick={() => window.location.reload()}
              className="px-8"
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const profile = loadState.profile;
  const state = deriveState(profile);

  return (
    <div className="min-h-screen bg-alice-gray px-6 py-12">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-navy-deep mb-2">
              Get paid
            </h1>
            <p className="text-gray-600 leading-relaxed">
              Connect Stripe to receive payouts. About 90 seconds.
            </p>
          </div>

          {state === "not-connected" && (
            <>
              <Button
                type="button"
                onClick={handleConnect}
                disabled={busy !== null}
                className="w-full"
              >
                {busy === "connect" ? "Starting…" : "Connect Stripe"}
              </Button>

              <div className="pt-4 border-t border-gray-100 space-y-3">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Or skip and finish setup. We'll hold your earnings in Opedd
                  escrow until you connect — there's no deadline, and we'll
                  email you when your first license sells.
                </p>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={busy !== null}
                  className="text-sm text-navy-deep hover:text-oxford font-medium disabled:opacity-60"
                >
                  {busy === "skip" ? "Skipping…" : "Skip — finish later"}
                </button>
              </div>
            </>
          )}

          {state === "partial" && (
            <>
              <StripeDisabledReasonDisplay
                reason={profile.stripe_disabled_reason}
              />
              <Button
                type="button"
                onClick={handleConnect}
                disabled={busy !== null}
                className="w-full"
              >
                {busy === "connect" ? "Resuming…" : "Resume Stripe setup"}
              </Button>
              <div className="pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={busy !== null}
                  className="text-sm text-navy-deep hover:text-oxford font-medium disabled:opacity-60"
                >
                  {busy === "skip" ? "Skipping…" : "Skip — finish later"}
                </button>
              </div>
            </>
          )}

          {state === "complete" && (
            <>
              <div
                role="status"
                className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-2"
              >
                <p className="text-lg font-semibold text-green-900">
                  Stripe connected
                </p>
                <p className="text-sm text-green-700">
                  You're ready to receive payouts when buyers license your
                  content.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleContinue}
                disabled={busy !== null}
                className="w-full"
              >
                {busy === "advance" ? "Continuing…" : "Continue"}
              </Button>
            </>
          )}

          {actionError && (
            <p
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"
            >
              {actionError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
