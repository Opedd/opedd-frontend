import { useCallback, useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useWizardState } from "@/hooks/useWizardState";
import { edgeFetch, verifyOwnershipApi } from "@/lib/api";

/**
 * Phase 3 Session 3.3 — Step 2 Substack (functional).
 *
 * Replaces the Session 3.1 Step2Stub for `platform === 'substack'`.
 * Wires SetupV2 to verify-ownership (email_to_publication method) +
 * import-substack-rss + extract-branding +
 * publisher-profile/grant_email_forwarding_consent.
 *
 * State machine driven by verify-ownership GET on mount:
 *   - is_verified === true                          → success state
 *                                                     (Continue button)
 *   - challenge present, not expired                → OTP entry
 *   - challenge present, expired                    → URL entry +
 *                                                     soft expired toast
 *   - no challenge / no ownership_verification      → URL entry (fresh)
 *
 * Linear UX flow:
 *   1. Mount → GET verify-ownership → derive initial UI state
 *   2. URL submit → verify-ownership send_code → render OTP screen
 *   3. OTP submit → verify-ownership confirm_code → on verified=true:
 *      - Promise.allSettled([
 *          import-substack-rss (RSS ingest, ~25 recent posts),
 *          extract-branding   (logo / banner / primary color scrape),
 *          publisher-profile  (grant_email_forwarding_consent),
 *        ])
 *      - All non-blocking on individual failure; the wizard advances
 *        regardless. import-rss failure surfaces a soft warning carried
 *        into Step 3; extract-branding fails silently per v2 spec.
 *      - wizard.advance({}) → SetupV2 routes to Step 3 stub
 *
 * Resume / Resend quota discipline:
 *   - GET on mount avoids re-firing send_code on browser refresh.
 *   - Local 60s cooldown on the Resend button + backend 5/hr rate
 *     limit. Both surfaced explicitly.
 *   - URL persisted via wizard.saveStepData({ substack_url }) on
 *     successful send_code so post-confirm finalize has the URL even
 *     if the user reloaded mid-OTP and didn't re-enter it.
 *
 * KNOWN LIMITATION (filed for Phase 4): Step2Substack v1 does NOT
 * call platform-connect, so no content_sources row is created. The
 * inbound-email function correlates inbound mail by FROM-domain →
 * content_sources.url, so v1 publishers' Substack forwards will
 * silently no-op until Phase 4 wires platform-connect / dashboard
 * ZIP upload. The instruction box still renders — v2 spec language
 * is shipped verbatim. Phase 4 closes the gap.
 *
 * LOVABLE-POLISH (Phase 10 handoff):
 * - Substack deep links (subscribers / export settings) hardcoded;
 *   spot-checkable. Update if Substack changes admin URL paths.
 * - OTP input is a single text input (maxLength 6); spec shows
 *   6-box rendering. Lovable polishes to per-digit boxes. Functional
 *   identity preserved.
 * - Static "Codes expire in 15 minutes" copy; live countdown deferred.
 * - No state-transition animations.
 * - "Use a different email" fallback link from v2 spec is omitted in
 *   v1 (single fallback path = restart with a different URL). DNS TXT
 *   fallback ships with Custom platform Step 2 (Phase 9).
 */

// v2 spec verbatim — Substack admin URLs (LOVABLE-POLISH spot-check)
const SUBSTACK_SUBSCRIBERS_URL =
  "https://substack.com/publish/subscribers/active";
const SUBSTACK_EXPORT_URL = "https://substack.com/publish/settings#export";

// Single shared inbound alias — see ARCHITECTURE.md inbound-email
// correlator. v2 spec mocked per-publisher aliases
// ({opedd+abc123}@inbound.opedd.com); production wiring is the single
// shared address correlated via FROM-domain → content_sources match.
const INBOUND_EMAIL_ALIAS = "newsletter@inbound.opedd.com";

const RESEND_COOLDOWN_MS = 60_000;
const OTP_TTL_SECONDS = 15 * 60;

const EDGE_BASE = "https://api.opedd.com";

type LoadState = "loading" | "ready" | "error";

interface ActiveChallenge {
  contactEmailMasked: string;
  expiresAt: string; // ISO
}

/**
 * Cheap email mask matching backend _shared/privacy.ts:maskEmail
 * shape: first char + "***" + "@" + domain. Used when GET resume
 * returns the raw contact_email (server stores raw; mask client-side
 * for display).
 */
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local[0] ?? ""}***@${domain}`;
}

/** Normalize URL — trim, prepend https:// if missing. */
function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function Step2Substack() {
  const wizard = useWizardState();
  const { getAccessToken } = useAuth();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Server-derived state (from verify-ownership GET).
  const [verified, setVerified] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge | null>(
    null,
  );

  // Form state.
  const persistedUrl =
    typeof wizard.setupData.substack_url === "string"
      ? (wizard.setupData.substack_url as string)
      : "";
  const [urlInput, setUrlInput] = useState(persistedUrl);
  const [codeInput, setCodeInput] = useState("");

  // Submission state.
  const [submitting, setSubmitting] = useState<
    null | "send" | "resend" | "confirm" | "finalize"
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [softNotice, setSoftNotice] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);

  // No-contact-email fallback from send_code response.
  const [noContactEmail, setNoContactEmail] = useState(false);

  // Auto-finalize trigger: after a successful confirm_code, we kick off
  // ingest+branding+consent without an extra click. The mount-time
  // resume path (verified=true on mount) keeps an explicit Continue
  // button — different UX, same code path.
  const autoFinalizeRef = useRef(false);

  // ─── Mount: GET verify-ownership ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const result = await verifyOwnershipApi.get(token);
        if (cancelled) return;
        if (result.is_verified) {
          setVerified(true);
        } else if (result.ownership_verification?.challenge) {
          const ch = result.ownership_verification.challenge;
          if (
            typeof ch.contact_email === "string" &&
            typeof ch.expires_at === "string"
          ) {
            if (new Date(ch.expires_at).getTime() > Date.now()) {
              setActiveChallenge({
                contactEmailMasked: maskEmail(ch.contact_email),
                expiresAt: ch.expires_at,
              });
            } else {
              setSoftNotice(
                "Your previous code expired — enter your URL to start again.",
              );
            }
          }
        }
        setLoadState("ready");
      } catch (err) {
        Sentry.addBreadcrumb({
          category: "step2-substack",
          level: "warning",
          message: "verify-ownership GET failed",
          data: { error: String(err).slice(0, 120) },
        });
        if (cancelled) return;
        // Non-fatal: fall through to URL entry. The next mutation will
        // surface any real backend issue with a specific error.
        setLoadState("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken]);

  // ─── Helpers ────────────────────────────────────────────────────

  const messageFor = (err: unknown, fallback: string): string => {
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  };

  const finalizeAndAdvance = useCallback(async () => {
    setSubmitting("finalize");
    setActionError(null);
    try {
      const url = normalizeUrl(urlInput || persistedUrl);
      const token = await getAccessToken();

      // Ingest, branding, and consent fire in parallel. None blocks
      // the wizard advance — failures surface as Sentry breadcrumbs
      // (extract-branding) or a warning toast carried into Step 3
      // (import-substack-rss).
      const feedUrl = url ? `${url.replace(/\/+$/, "")}/feed` : null;

      const [importResult, brandingResult, consentResult] = await Promise.allSettled([
        feedUrl
          ? edgeFetch<{ imported: number; total: number }>(
              `${EDGE_BASE}/import-substack-rss`,
              { method: "POST", body: JSON.stringify({ feed_url: feedUrl }) },
              token,
            )
          : Promise.reject(new Error("missing publication URL")),
        url
          ? edgeFetch<Record<string, unknown>>(
              `${EDGE_BASE}/extract-branding`,
              {
                method: "POST",
                body: JSON.stringify({ platform: "substack", url }),
              },
              token,
            )
          : Promise.reject(new Error("missing publication URL")),
        edgeFetch<Record<string, unknown>>(
          `${EDGE_BASE}/publisher-profile`,
          {
            method: "POST",
            body: JSON.stringify({
              action: "grant_email_forwarding_consent",
              subscription_type: "paid_complimentary",
            }),
          },
          token,
        ),
      ]);

      let warning: string | null = null;
      if (importResult.status === "rejected") {
        warning =
          "Your verification worked, but RSS import had an issue — we will retry from your dashboard.";
        Sentry.captureException(importResult.reason, {
          tags: { component: "Step2Substack", phase: "import_rss" },
        });
      }
      if (brandingResult.status === "rejected") {
        // Per v2 spec: silent failure. Breadcrumb only.
        Sentry.addBreadcrumb({
          category: "step2-substack",
          level: "warning",
          message: "extract-branding failed",
          data: {
            error: String(brandingResult.reason).slice(0, 120),
          },
        });
      }
      if (consentResult.status === "rejected") {
        // Forwarding consent failure is non-blocking — Phase 4 owns
        // the dashboard ZIP upload path that doesn't depend on it.
        Sentry.captureException(consentResult.reason, {
          tags: { component: "Step2Substack", phase: "grant_consent" },
        });
      }

      if (warning) setWarningMessage(warning);

      await wizard.advance({});
      // SetupV2 re-renders Step 3 stub on next paint.
    } catch (err) {
      setSubmitting(null);
      setActionError(
        messageFor(err, "Couldn't continue — please reload and try again"),
      );
      Sentry.captureException(err, {
        tags: { component: "Step2Substack", phase: "finalize" },
      });
    }
  }, [getAccessToken, urlInput, persistedUrl, wizard]);

  // After a fresh confirm_code success, fire finalize automatically.
  // The resume path (verified=true on mount) does NOT auto-fire — user
  // explicitly clicks Continue to re-trigger ingest/branding.
  useEffect(() => {
    if (verified && autoFinalizeRef.current) {
      autoFinalizeRef.current = false;
      void finalizeAndAdvance();
    }
  }, [verified, finalizeAndAdvance]);

  // ─── Handlers ───────────────────────────────────────────────────

  const handleSubmitUrl = useCallback(async () => {
    if (submitting) return;
    setActionError(null);
    setSoftNotice(null);
    setNoContactEmail(false);

    const url = normalizeUrl(urlInput);
    if (!url) {
      setActionError("Please enter your Substack URL");
      return;
    }

    setSubmitting("send");
    try {
      const token = await getAccessToken();
      const result = await verifyOwnershipApi.sendCode(url, token);

      if (result.verified === false && result.reason === "no_contact_email_found") {
        setNoContactEmail(true);
        return;
      }

      if (result.reason === "code_sent" || result.awaiting_confirmation) {
        setActiveChallenge({
          contactEmailMasked:
            result.code_sent_to ?? "your publication's contact email",
          expiresAt: new Date(
            Date.now() + (result.expires_in_seconds ?? OTP_TTL_SECONDS) * 1000,
          ).toISOString(),
        });
        setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);

        // Persist URL into setup_data so a mid-OTP reload still has the
        // URL available for finalize. Best-effort — saveStepData
        // failure doesn't block flow (URL stays in local state).
        try {
          await wizard.saveStepData({ substack_url: url });
        } catch (err) {
          Sentry.addBreadcrumb({
            category: "step2-substack",
            level: "warning",
            message: "saveStepData(substack_url) failed",
            data: { error: String(err).slice(0, 120) },
          });
        }
        return;
      }

      // Unexpected response — surface honestly
      setActionError(
        `Unexpected response from verification: ${result.reason ?? "unknown"}`,
      );
    } catch (err) {
      setActionError(
        messageFor(err, "Couldn't send verification email — please try again"),
      );
      Sentry.captureException(err, {
        tags: { component: "Step2Substack", phase: "send_code" },
      });
    } finally {
      setSubmitting((s) => (s === "send" ? null : s));
    }
  }, [submitting, urlInput, getAccessToken, wizard]);

  const handleResend = useCallback(async () => {
    if (submitting) return;
    if (Date.now() < resendAvailableAt) return;
    setActionError(null);
    setSoftNotice(null);

    const url = normalizeUrl(urlInput || persistedUrl);
    if (!url) {
      setActionError("Please re-enter your URL to resend");
      setActiveChallenge(null);
      return;
    }

    setSubmitting("resend");
    try {
      const token = await getAccessToken();
      const result = await verifyOwnershipApi.sendCode(url, token);
      if (result.reason === "code_sent" || result.awaiting_confirmation) {
        setActiveChallenge({
          contactEmailMasked:
            result.code_sent_to ?? "your publication's contact email",
          expiresAt: new Date(
            Date.now() + (result.expires_in_seconds ?? OTP_TTL_SECONDS) * 1000,
          ).toISOString(),
        });
        setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
        setSoftNotice("New code sent.");
      } else if (result.reason === "no_contact_email_found") {
        setNoContactEmail(true);
        setActiveChallenge(null);
      } else {
        setActionError(
          `Unexpected response from verification: ${result.reason ?? "unknown"}`,
        );
      }
    } catch (err) {
      setActionError(
        messageFor(err, "Couldn't resend code — please try again in a minute"),
      );
      Sentry.captureException(err, {
        tags: { component: "Step2Substack", phase: "resend_code" },
      });
    } finally {
      setSubmitting((s) => (s === "resend" ? null : s));
    }
  }, [
    submitting,
    resendAvailableAt,
    urlInput,
    persistedUrl,
    getAccessToken,
  ]);

  const handleSubmitCode = useCallback(async () => {
    if (submitting) return;
    setActionError(null);

    const code = codeInput.trim();
    if (!/^\d{6}$/.test(code)) {
      setActionError("Code must be 6 digits");
      return;
    }

    setSubmitting("confirm");
    try {
      const token = await getAccessToken();
      const result = await verifyOwnershipApi.confirmCode(code, token);

      if (result.verified === false && result.reason === "code_mismatch") {
        setActionError("Wrong code — please try again");
        setSubmitting(null);
        return;
      }

      if (result.verified === true) {
        setActiveChallenge(null);
        autoFinalizeRef.current = true;
        setVerified(true);
        // useEffect picks up `verified && autoFinalizeRef.current` and
        // fires finalizeAndAdvance. Submitting state stays "confirm"
        // through the transition into "finalize".
        return;
      }

      // Unexpected response
      setActionError(
        `Unexpected response from verification: ${result.reason ?? "unknown"}`,
      );
      setSubmitting(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // Backend signals via human-readable error messages mapped from
      // ErrorCode (CHALLENGE_EXPIRED → 410 / TOO_MANY_ATTEMPTS → 429).
      // edgeFetch surfaces the message string directly.
      if (/expired/i.test(msg)) {
        setActiveChallenge(null);
        setSoftNotice("Your code expired — please request a new one.");
      } else if (/too many/i.test(msg)) {
        setActiveChallenge(null);
        setSoftNotice("Too many wrong codes — please request a new one.");
      } else {
        setActionError(
          messageFor(err, "Couldn't verify code — please try again"),
        );
      }
      Sentry.captureException(err, {
        tags: { component: "Step2Substack", phase: "confirm_code" },
      });
      setSubmitting(null);
    }
  }, [submitting, codeInput, getAccessToken]);

  const handleResumeContinue = useCallback(async () => {
    // Resume path (verified=true on mount): user clicks Continue,
    // which re-fires the parallel ingest/branding/consent calls and
    // then advances. Idempotent on the backend side.
    await finalizeAndAdvance();
  }, [finalizeAndAdvance]);

  const handleStartOver = useCallback(() => {
    setActiveChallenge(null);
    setCodeInput("");
    setActionError(null);
    setSoftNotice(null);
    setNoContactEmail(false);
  }, []);

  // ─── Render ─────────────────────────────────────────────────────

  if (loadState === "loading") {
    return (
      <div className="min-h-screen bg-alice-gray flex items-center justify-center">
        <Spinner size="lg" className="text-oxford" />
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="min-h-screen bg-alice-gray px-6 py-12">
        <div className="max-w-lg mx-auto">
          <div
            role="alert"
            className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center space-y-4"
          >
            <h1 className="text-xl font-semibold text-red-900">
              Couldn't load Step 2
            </h1>
            <p className="text-gray-600">
              {loadError ?? "Please reload and try again."}
            </p>
            <Button
              type="button"
              onClick={() => window.location.reload()}
              className="px-8"
            >
              Reload
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Verified (resume path OR mid-finalize) — explicit Continue button.
  // The auto-finalize useEffect is what drives confirm_code → advance;
  // this UI is what the user sees in both the resume entry and the
  // brief gap between confirm and advance.
  if (verified) {
    const isFinalizing = submitting === "finalize" || submitting === "confirm";
    return (
      <div className="min-h-screen bg-alice-gray px-6 py-12">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10 space-y-6">
            <div
              role="status"
              className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-2"
            >
              <p className="text-lg font-semibold text-green-900">
                Your Substack is verified
              </p>
              <p className="text-sm text-green-700">
                We're indexing your archive. Continue to see what buyers will
                find.
              </p>
            </div>
            {actionError && (
              <p
                role="alert"
                className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"
              >
                {actionError}
              </p>
            )}
            <Button
              type="button"
              onClick={handleResumeContinue}
              disabled={isFinalizing}
              className="w-full"
            >
              {isFinalizing ? "Continuing…" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // OTP entry screen (active challenge present, not expired).
  if (activeChallenge) {
    const isResending = submitting === "resend";
    const isConfirming = submitting === "confirm" || submitting === "finalize";
    const cooldownRemaining = Math.max(0, resendAvailableAt - Date.now());
    const resendDisabled =
      isResending || isConfirming || cooldownRemaining > 0;

    return (
      <div className="min-h-screen bg-alice-gray px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10 space-y-8">
            <header>
              <h1 className="text-2xl font-semibold text-navy-deep mb-2">
                One trip to Substack. Two things to do.
              </h1>
              <p className="text-gray-600 leading-relaxed">
                We've sent a verification code to{" "}
                <span className="font-medium text-navy-deep">
                  {activeChallenge.contactEmailMasked}
                </span>
                . While you wait for it, complete these two steps in Substack:
              </p>
            </header>

            {softNotice && (
              <p
                role="status"
                className="text-sm text-blue-900 bg-blue-50 border border-blue-200 rounded-lg p-3"
              >
                {softNotice}
              </p>
            )}

            {/* Box 1: complimentary paid subscription (forwarding) */}
            <section
              aria-labelledby="forwarding-label"
              className="border border-gray-200 rounded-xl p-5 space-y-3"
            >
              <h2
                id="forwarding-label"
                className="text-sm font-semibold text-navy-deep"
              >
                1. Add Opedd as a complimentary paid subscriber
              </h2>
              <ol className="text-xs text-gray-600 leading-relaxed list-decimal pl-4 space-y-1">
                <li>
                  Go to: Substack Dashboard → Subscribers → New → Add by email
                </li>
              </ol>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Email to add:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm font-mono text-navy-deep">
                    {INBOUND_EMAIL_ALIAS}
                  </code>
                  <Button
                    type="button"
                    onClick={() =>
                      navigator.clipboard?.writeText(INBOUND_EMAIL_ALIAS)
                    }
                    className="shrink-0"
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Set as: Complimentary subscription → Paid tier
              </p>
              <p className="text-xs text-gray-500">
                This forwards new posts to Opedd as you publish them.
              </p>
              <a
                href={SUBSTACK_SUBSCRIBERS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-navy-deep hover:text-oxford font-medium"
              >
                Open Substack subscribers settings ↗
              </a>
            </section>

            {/* Box 2: archive export trigger */}
            <section
              aria-labelledby="export-label"
              className="border border-gray-200 rounded-xl p-5 space-y-3"
            >
              <h2
                id="export-label"
                className="text-sm font-semibold text-navy-deep"
              >
                2. Trigger your archive export
              </h2>
              <ol className="text-xs text-gray-600 leading-relaxed list-decimal pl-4 space-y-1">
                <li>
                  Go to: Substack Dashboard → Settings → Export data → Click
                  "Export data"
                </li>
              </ol>
              <p className="text-xs text-gray-500 leading-relaxed">
                Substack will email you a ZIP file in 5–30 minutes. You'll
                upload it from your Opedd dashboard later — no need to wait
                now.
              </p>
              <a
                href={SUBSTACK_EXPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-navy-deep hover:text-oxford font-medium"
              >
                Open Substack export settings ↗
              </a>
            </section>

            <p className="text-sm text-gray-600 text-center">
              Once you've done both, come back here.
            </p>

            {/* OTP input */}
            <section
              aria-labelledby="otp-label"
              className="space-y-3 border-t border-gray-100 pt-6"
            >
              <label
                id="otp-label"
                htmlFor="otp-input"
                className="block text-sm font-medium text-navy-deep"
              >
                Verification code from {activeChallenge.contactEmailMasked}:
              </label>
              <Input
                id="otp-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={codeInput}
                onChange={(e) =>
                  setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                disabled={isConfirming}
                maxLength={6}
                aria-label="Verification code"
                className="font-mono tracking-widest text-center text-lg"
              />
              <p className="text-xs text-gray-500">Codes expire in 15 minutes.</p>

              {actionError && (
                <p
                  role="alert"
                  className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"
                >
                  {actionError}
                </p>
              )}

              <Button
                type="button"
                onClick={handleSubmitCode}
                disabled={isConfirming || codeInput.length !== 6}
                className="w-full"
              >
                {isConfirming ? "Verifying…" : "Verify code"}
              </Button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendDisabled}
                  className="text-navy-deep hover:text-oxford font-medium disabled:opacity-60"
                >
                  {isResending
                    ? "Resending…"
                    : cooldownRemaining > 0
                      ? `Resend code (${Math.ceil(cooldownRemaining / 1000)}s)`
                      : "Resend code"}
                </button>
                <button
                  type="button"
                  onClick={handleStartOver}
                  disabled={isConfirming || isResending}
                  className="text-gray-500 hover:text-navy-deep disabled:opacity-60"
                >
                  Use a different URL
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // No-contact-email fallback screen.
  if (noContactEmail) {
    return (
      <div className="min-h-screen bg-alice-gray px-6 py-12">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10 space-y-6">
            <header>
              <h1 className="text-2xl font-semibold text-navy-deep mb-2">
                We couldn't find a contact email
              </h1>
              <p className="text-gray-600 leading-relaxed">
                We looked at this Substack and couldn't find a public contact
                email to send the verification code to. Please double-check the
                URL — make sure it's the URL of your main Substack page (not a
                specific post or section).
              </p>
            </header>
            <Button
              type="button"
              onClick={() => {
                setNoContactEmail(false);
                setActionError(null);
              }}
              className="w-full"
            >
              Try a different URL
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default: URL entry screen.
  if (warningMessage) {
    // If a warning bubbled in from a prior path (e.g. expired challenge
    // detected on mount), surface it once here; the next render path
    // clears it implicitly by leaving the URL form.
  }

  const isSending = submitting === "send";
  return (
    <div className="min-h-screen bg-alice-gray px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10 space-y-6">
          <header>
            <h1 className="text-2xl font-semibold text-navy-deep mb-2">
              Connect your Substack
            </h1>
            <p className="text-gray-600 leading-relaxed">
              What we need: your Substack URL and a brief detour to your
              Substack settings.
            </p>
          </header>

          {softNotice && (
            <p
              role="status"
              className="text-sm text-blue-900 bg-blue-50 border border-blue-200 rounded-lg p-3"
            >
              {softNotice}
            </p>
          )}

          <section aria-labelledby="url-label" className="space-y-3">
            <label
              id="url-label"
              htmlFor="substack-url"
              className="block text-sm font-medium text-gray-700"
            >
              Your Substack URL
            </label>
            <Input
              id="substack-url"
              type="url"
              placeholder="https://yourname.substack.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={isSending}
              aria-label="Substack URL"
              autoFocus
            />
            <p className="text-xs text-gray-500">
              Custom domain? Enter it here — we'll detect your Substack alias
              automatically.
            </p>
          </section>

          {actionError && (
            <p
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"
            >
              {actionError}
            </p>
          )}

          <Button
            type="button"
            onClick={handleSubmitUrl}
            disabled={isSending}
            className="w-full"
          >
            {isSending ? "Sending code…" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
