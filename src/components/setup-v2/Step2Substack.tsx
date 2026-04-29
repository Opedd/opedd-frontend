import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useWizardState } from "@/hooks/useWizardState";
import { edgeFetch, verifyOwnershipApi } from "@/lib/api";
import type { VerifyOwnershipResult } from "@/lib/api";
import { TokenDisplay } from "./TokenDisplay";

/**
 * Phase 4 Session 4.1.4 — Step 2 Substack rewrite (visible_text_token + DNS).
 *
 * Replaces the Session 3.3 email_to_publication OTP flow (deprecated by
 * backend Session 4.1.2 — handler returns 410 GONE). New 2-action UX
 * driven by the visible_text_token method, with optional DNS TXT record
 * sidebar for custom-domain Substacks.
 *
 * View modes:
 *   - LOADING        — initial GET verify-ownership + publisher-profile
 *   - URL_ENTRY      — publisher pastes Substack URL; we issue
 *                      visible_text_token; (custom-domain detected →
 *                      offer DNS sidebar in active mode)
 *   - ACTIVE         — TokenDisplay (token + copy + countdown + regen) +
 *                      "Verify now" primary CTA + Action B (passive:
 *                      add inbound_email alias to Substack subscribers
 *                      for continuous-trust signal) + optional DNS
 *                      sidebar (custom-domain only)
 *   - SUCCESS        — "Verified!" — fires finalize (import-substack-rss +
 *                      extract-branding via Promise.allSettled; consent
 *                      INSERT now happens server-side in verify-ownership
 *                      method handler per Session 4.1.2/4.1.4 KI #48
 *                      closure, so it's NOT in the parallel call list
 *                      here).
 *
 * Backend contract (per src/lib/api.ts verifyOwnershipApi):
 *   - issueVisibleTextToken(publication_url) → { instructions, expires_in_seconds, ... }
 *   - verifyVisibleTextToken()                → { verified: bool, reason?, evidence? }
 *   - issueDnsTxtToken(domain)                → { instructions: { record_type: 'TXT', name, value, ttl }, ... }
 *   - checkDnsTxtToken()                      → { verified: bool, reason?, evidence? }
 *
 * Both visible_text_token AND dns_txt_record direct-flip the publishers
 * row on success (KI #48 closed Session 4.1.4 pre-flight). Symmetric
 * "Verified — listed now" UX for both methods; no asymmetric messaging.
 *
 * Resume / re-mount discipline:
 *   - GET verify-ownership on mount derives initial view mode from
 *     server state (active challenge → ACTIVE; verified → SUCCESS).
 *   - URL persisted via wizard.saveStepData({ substack_url }) so a
 *     mid-flow refresh preserves it.
 *   - Continuous-trust state (publishers.continuous_trust_verified) is
 *     NOT surfaced in publisher-facing UX per Adjustment 1 framing —
 *     it's a LIVENESS signal for admin queue, not a verification gate.
 *
 * LOVABLE-POLISH (Phase 10 handoff):
 *   - Substack admin deep-links hardcoded; spot-checkable.
 *   - DNS sidebar copy is functional; not yet polished. Custom-domain
 *     Substack publishers are technical enough to handle DNS-record
 *     editing — UX assumes DNS terminology.
 *   - Token paste hint is single-line; full step-by-step illustrated
 *     guide deferred.
 *   - No state-transition animations.
 */

const SUBSTACK_SUBSCRIBERS_URL =
  "https://substack.com/publish/subscribers/active";

const EDGE_BASE = "https://api.opedd.com";

type ViewMode = "loading" | "url_entry" | "active" | "success" | "error";

interface VtChallenge {
  token: string; // plaintext; only available right after issue_token (not on resume)
  expiresAt: string;
  regenCooldownUntil: string | null;
}

interface DnsChallenge {
  recordName: string;
  recordValue: string;
  ttl: number;
  expiresAt: string;
}

/** Normalize URL — trim, prepend https:// if missing. */
function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Detect if a Substack URL is on a custom domain (e.g., chinatalk.media)
 * vs the hosted *.substack.com pattern. Custom-domain publishers have
 * the OPTION to use DNS TXT verification; hosted-domain publishers can
 * only use visible_text_token. Decision matters for the optional DNS
 * sidebar visibility.
 */
function isCustomDomain(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !host.endsWith(".substack.com") && host !== "substack.com";
  } catch {
    return false;
  }
}

/**
 * Extract the apex domain from a custom-domain Substack URL. For
 * chinatalk.media → 'chinatalk.media'. Used as the `domain` arg to
 * dns_txt_record.issueToken.
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

interface PublisherProfileSummary {
  inbound_email?: string | null;
  verification_status?: string | null;
}

/**
 * Convert a backend RATE_LIMITED error (issue_token's 3-per-24h cap
 * fired) into an approximate cooldown-until ISO timestamp. Backend
 * doesn't surface a Retry-After header today — we use 24h from now as
 * a conservative cooldown so the regen button shows a credible
 * countdown. Imprecise but safe (bounded over-wait, never undercounts).
 */
function approxRegenCooldown(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

function messageFor(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function Step2Substack() {
  const wizard = useWizardState();
  const { getAccessToken } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Server-derived state.
  const [vtChallenge, setVtChallenge] = useState<VtChallenge | null>(null);
  const [dnsChallenge, setDnsChallenge] = useState<DnsChallenge | null>(null);
  const [inboundEmail, setInboundEmail] = useState<string | null>(null);

  // Persisted URL via wizard step_data (mid-flow refresh resilience).
  const persistedUrl =
    typeof wizard.setupData.substack_url === "string"
      ? (wizard.setupData.substack_url as string)
      : "";
  const [urlInput, setUrlInput] = useState(persistedUrl);

  // Submission + UX state.
  const [submitting, setSubmitting] = useState<
    null | "issue" | "verify" | "regen" | "dns_issue" | "dns_check" | "finalize"
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [softNotice, setSoftNotice] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [showDnsOption, setShowDnsOption] = useState(false);

  // Auto-finalize trigger: after a successful verify_token / check_token,
  // we kick off ingest+branding without an extra click. Resume path
  // (verified=true on mount) keeps an explicit Continue.
  const autoFinalizeRef = useRef(false);

  const resolvedUrl = useMemo(
    () => normalizeUrl(urlInput || persistedUrl),
    [urlInput, persistedUrl],
  );
  const isOnCustomDomain = useMemo(
    () => (resolvedUrl ? isCustomDomain(resolvedUrl) : false),
    [resolvedUrl],
  );

  // ─── Mount: GET verify-ownership + GET publisher-profile (for inbound_email) ───
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const [ownership, profile] = await Promise.all([
          verifyOwnershipApi.get(token),
          edgeFetch<PublisherProfileSummary>(
            `${EDGE_BASE}/publisher-profile`,
            { method: "GET" },
            token,
          ),
        ]);
        if (cancelled) return;

        setInboundEmail(profile?.inbound_email ?? null);

        if (ownership.is_verified) {
          setViewMode("success");
          setVtChallenge(null);
          return;
        }

        const ov = ownership.ownership_verification;
        const ch = ov?.challenge;
        if (
          ov?.method === "visible_text_token" &&
          ch?.expires_at &&
          new Date(ch.expires_at).getTime() > Date.now()
        ) {
          // Resume an in-flight challenge. Plaintext token is NOT in the
          // resume payload (only the hash) — show TokenDisplay with the
          // hash-displayed-as-redacted is awkward, so we ask the publisher
          // to re-issue. Cleaner UX: regen + show new token.
          //
          // Trade-off: re-issue counts against the 3-per-24h regen cap.
          // Acceptable cost for resume robustness; if cap is hit, the
          // backend 429 surfaces the cooldown via the regen button text.
          setViewMode("active");
          setVtChallenge(null);
          setSoftNotice(
            "We have an active verification in progress — regenerate your token to continue.",
          );
        } else if (
          ov?.method === "dns_txt_record" &&
          ch?.expires_at &&
          new Date(ch.expires_at).getTime() > Date.now() &&
          typeof ch.record_name === "string" &&
          typeof ch.token === "string"
        ) {
          // Resume DNS challenge. Unlike visible_text_token, dns_txt_record
          // stores plaintext (the TXT value IS the token) so we can
          // resume the display directly.
          setDnsChallenge({
            recordName: ch.record_name,
            recordValue: ch.token,
            ttl: 300,
            expiresAt: ch.expires_at,
          });
          setShowDnsOption(true);
          setViewMode("active");
        } else if (ov?.status === "expired") {
          setSoftNotice(
            "Your previous verification expired — paste your Substack URL to start again.",
          );
          setViewMode("url_entry");
        } else {
          setViewMode("url_entry");
        }
      } catch (err) {
        Sentry.addBreadcrumb({
          category: "step2-substack",
          level: "error",
          message: "mount GET failed",
          data: { error: String(err).slice(0, 120) },
        });
        if (!cancelled) {
          setLoadError(messageFor(err, "Couldn't load — please refresh."));
          setViewMode("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken]);

  // ─── Finalize (post-verify): import RSS + extract branding ───────
  // Consent INSERT removed (Session 4.1.2 visible_text_token method handler
  // writes it server-side; KI #41 closed by Session 4.1.3 inbound-email
  // TO-routing). Two parallel calls only.
  const finalizeAndAdvance = useCallback(async () => {
    setSubmitting("finalize");
    setActionError(null);
    try {
      const url = resolvedUrl;
      const token = await getAccessToken();
      const feedUrl = url ? `${url.replace(/\/+$/, "")}/feed` : null;

      const [importResult, brandingResult] = await Promise.allSettled([
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
        // v2 spec: silent failure for branding. Breadcrumb only.
        Sentry.addBreadcrumb({
          category: "step2-substack",
          level: "warning",
          message: "extract-branding failed",
          data: { error: String(brandingResult.reason).slice(0, 120) },
        });
      }
      if (warning) setWarningMessage(warning);

      await wizard.advance({});
    } catch (err) {
      setSubmitting(null);
      setActionError(
        messageFor(err, "Couldn't continue — please reload and try again"),
      );
      Sentry.captureException(err, {
        tags: { component: "Step2Substack", phase: "finalize" },
      });
    }
  }, [getAccessToken, resolvedUrl, wizard]);

  useEffect(() => {
    if (viewMode === "success" && autoFinalizeRef.current) {
      autoFinalizeRef.current = false;
      void finalizeAndAdvance();
    }
  }, [viewMode, finalizeAndAdvance]);

  // ─── Handlers ───────────────────────────────────────────────────

  const handleSubmitUrl = useCallback(async () => {
    if (submitting) return;
    setActionError(null);
    setSoftNotice(null);

    const url = normalizeUrl(urlInput);
    if (!url) {
      setActionError("Please enter your Substack URL");
      return;
    }

    setSubmitting("issue");
    try {
      const token = await getAccessToken();
      // Persist URL before the network call so a mid-flight refresh
      // preserves it.
      await wizard.saveStepData({ substack_url: url });
      const result: VerifyOwnershipResult =
        await verifyOwnershipApi.issueVisibleTextToken(url, token);

      if (!result.instructions?.value || !result.expires_in_seconds) {
        throw new Error("issue_token response missing token");
      }

      setVtChallenge({
        token: result.instructions.value,
        expiresAt: new Date(
          Date.now() + result.expires_in_seconds * 1000,
        ).toISOString(),
        regenCooldownUntil: null,
      });
      setShowDnsOption(isCustomDomain(url));
      setSubmitting(null);
      setViewMode("active");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/rate.?limit|too many/i.test(msg)) {
        setActionError("Too many tries — please wait before trying again.");
      } else {
        setActionError(messageFor(err, "Couldn't issue verification token"));
      }
      Sentry.captureException(err, {
        tags: { component: "Step2Substack", phase: "issue_token" },
      });
      setSubmitting(null);
    }
  }, [submitting, urlInput, getAccessToken, wizard]);

  const handleVerify = useCallback(async () => {
    if (submitting) return;
    setActionError(null);
    setSoftNotice(null);

    setSubmitting("verify");
    try {
      const token = await getAccessToken();
      const result = await verifyOwnershipApi.verifyVisibleTextToken(token);

      if (result.verified === true) {
        autoFinalizeRef.current = true;
        setViewMode("success");
        // useEffect picks up viewMode === 'success' && autoFinalizeRef
        // and fires finalizeAndAdvance.
        return;
      }

      // Friendly retry messaging by reason.
      const reason = result.reason ?? "verification_failed";
      if (reason === "token_not_found_in_about_page") {
        setActionError(
          "We didn't find the token on your About page yet. Did you save the page after pasting?",
        );
      } else if (/scrape_failed|fetch_failed/.test(reason)) {
        setActionError(
          "Couldn't reach your Substack page — please check the URL and try again.",
        );
      } else {
        setActionError(`Verification didn't succeed: ${reason}`);
      }
      setSubmitting(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/expired/i.test(msg)) {
        setVtChallenge(null);
        setSoftNotice("Your token expired — generate a new one to continue.");
      } else if (/not.?found/i.test(msg)) {
        setVtChallenge(null);
        setSoftNotice(
          "No active verification — paste your Substack URL to start.",
        );
        setViewMode("url_entry");
      } else {
        setActionError(messageFor(err, "Couldn't verify token"));
      }
      Sentry.captureException(err, {
        tags: { component: "Step2Substack", phase: "verify_token" },
      });
      setSubmitting(null);
    }
  }, [submitting, getAccessToken]);

  const handleRegen = useCallback(async () => {
    if (submitting) return;
    setActionError(null);
    setSoftNotice(null);

    const url = resolvedUrl;
    if (!url) return;

    setSubmitting("regen");
    try {
      const token = await getAccessToken();
      const result = await verifyOwnershipApi.issueVisibleTextToken(url, token);
      if (!result.instructions?.value || !result.expires_in_seconds) {
        throw new Error("issue_token response missing token");
      }
      setVtChallenge({
        token: result.instructions.value,
        expiresAt: new Date(
          Date.now() + result.expires_in_seconds * 1000,
        ).toISOString(),
        regenCooldownUntil: null,
      });
      setSubmitting(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/rate.?limit|too many|29[\s.]/i.test(msg)) {
        // Backend 429 → 3 regens / 24h cap hit. Surface cooldown text
        // on the regen button instead of a generic error toast.
        setVtChallenge((prev) =>
          prev ? { ...prev, regenCooldownUntil: approxRegenCooldown() } : prev,
        );
        setActionError(
          "Regeneration limit reached (3 per 24 hours). Please paste the existing token instead, or wait.",
        );
      } else {
        setActionError(messageFor(err, "Couldn't regenerate token"));
      }
      Sentry.captureException(err, {
        tags: { component: "Step2Substack", phase: "regen_token" },
      });
      setSubmitting(null);
    }
  }, [submitting, resolvedUrl, getAccessToken]);

  const handleEnableDns = useCallback(async () => {
    if (submitting) return;
    setActionError(null);
    setSoftNotice(null);

    const url = resolvedUrl;
    const domain = extractDomain(url);
    if (!domain) {
      setActionError("Couldn't determine your domain — please check the URL.");
      return;
    }

    setSubmitting("dns_issue");
    try {
      const token = await getAccessToken();
      const result = await verifyOwnershipApi.issueDnsTxtToken(domain, token);
      if (
        !result.instructions?.name ||
        !result.instructions?.value ||
        !result.expires_in_seconds
      ) {
        throw new Error("DNS issue_token response missing instructions");
      }
      setDnsChallenge({
        recordName: result.instructions.name,
        recordValue: result.instructions.value,
        ttl: result.instructions.ttl ?? 300,
        expiresAt: new Date(
          Date.now() + result.expires_in_seconds * 1000,
        ).toISOString(),
      });
      setSubmitting(null);
    } catch (err) {
      setActionError(messageFor(err, "Couldn't issue DNS token"));
      Sentry.captureException(err, {
        tags: { component: "Step2Substack", phase: "dns_issue_token" },
      });
      setSubmitting(null);
    }
  }, [submitting, resolvedUrl, getAccessToken]);

  const handleCheckDns = useCallback(async () => {
    if (submitting) return;
    setActionError(null);
    setSoftNotice(null);

    setSubmitting("dns_check");
    try {
      const token = await getAccessToken();
      const result = await verifyOwnershipApi.checkDnsTxtToken(token);
      if (result.verified === true) {
        autoFinalizeRef.current = true;
        setViewMode("success");
        return;
      }
      if (result.reason === "dns_record_not_found") {
        setActionError(
          "We didn't see the TXT record yet. DNS can take a few minutes to propagate — please try again.",
        );
      } else {
        setActionError(`DNS check didn't succeed: ${result.reason ?? "unknown"}`);
      }
      setSubmitting(null);
    } catch (err) {
      setActionError(messageFor(err, "Couldn't check DNS record"));
      Sentry.captureException(err, {
        tags: { component: "Step2Substack", phase: "dns_check_token" },
      });
      setSubmitting(null);
    }
  }, [submitting, getAccessToken]);

  const handleResumeContinue = useCallback(async () => {
    await finalizeAndAdvance();
  }, [finalizeAndAdvance]);

  // ─── Render ─────────────────────────────────────────────────────

  if (viewMode === "loading") {
    return (
      <div className="min-h-screen bg-alice-gray flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (viewMode === "error") {
    return (
      <div className="min-h-screen bg-alice-gray flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-lg p-6 shadow-sm">
          <p className="text-red-600 mb-4">{loadError}</p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </div>
    );
  }

  if (viewMode === "success") {
    return (
      <div className="min-h-screen bg-alice-gray flex items-center justify-center px-6">
        <div
          className="max-w-md w-full bg-white rounded-lg p-8 shadow-sm text-center"
          data-testid="step2-success"
        >
          <h1 className="text-2xl font-semibold mb-3">Verified.</h1>
          <p className="text-gray-700 mb-6">
            Your publication is now licensed via Opedd.
          </p>
          {warningMessage ? (
            <p
              className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4"
              data-testid="step2-warning"
            >
              {warningMessage}
            </p>
          ) : null}
          {submitting === "finalize" ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Spinner />
              <span>Importing your recent posts…</span>
            </div>
          ) : (
            <Button onClick={handleResumeContinue} disabled={!!submitting}>
              Continue
            </Button>
          )}
          {actionError ? (
            <p className="mt-4 text-sm text-red-600" data-testid="step2-error">
              {actionError}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (viewMode === "url_entry") {
    return (
      <div className="min-h-screen bg-alice-gray flex items-center justify-center px-6 py-12">
        <div className="max-w-xl w-full bg-white rounded-lg p-8 shadow-sm space-y-5">
          <header>
            <h1 className="text-2xl font-semibold mb-2">Verify your Substack</h1>
            <p className="text-gray-700">
              Paste your Substack URL. We'll issue a small token for you to
              place on your About page; we then verify ownership by reading
              that page.
            </p>
          </header>

          {softNotice ? (
            <p
              className="text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded p-3"
              data-testid="step2-soft-notice"
            >
              {softNotice}
            </p>
          ) : null}

          <div>
            <label
              htmlFor="substack-url"
              className="block text-sm font-medium text-gray-800 mb-1"
            >
              Your Substack URL
            </label>
            <Input
              id="substack-url"
              data-testid="step2-url-input"
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="yourpublication.substack.com or your-custom-domain.com"
              disabled={!!submitting}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSubmitUrl();
              }}
            />
          </div>

          {actionError ? (
            <p className="text-sm text-red-600" data-testid="step2-error">
              {actionError}
            </p>
          ) : null}

          <Button
            onClick={handleSubmitUrl}
            disabled={!!submitting || !urlInput.trim()}
            data-testid="step2-url-submit"
          >
            {submitting === "issue" ? <Spinner /> : "Continue"}
          </Button>
        </div>
      </div>
    );
  }

  // viewMode === 'active' — TokenDisplay + Action B + optional DNS sidebar
  return (
    <div className="min-h-screen bg-alice-gray flex items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full bg-white rounded-lg p-8 shadow-sm space-y-6">
        <header>
          <h1 className="text-2xl font-semibold mb-2">Verify your Substack</h1>
          <p className="text-gray-700">
            One quick step: paste this token on your About page and click
            verify.
          </p>
        </header>

        {softNotice ? (
          <p
            className="text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded p-3"
            data-testid="step2-soft-notice"
          >
            {softNotice}
          </p>
        ) : null}

        {/* Action A — Primary: paste token + verify */}
        <section data-testid="step2-action-a" className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">
            1. Paste this token on your /about page
          </h2>
          {vtChallenge ? (
            <TokenDisplay
              token={vtChallenge.token}
              expiresAt={vtChallenge.expiresAt}
              regenCooldownUntil={vtChallenge.regenCooldownUntil}
              onRegen={handleRegen}
              hintText={`Paste the token anywhere on your /about page (${resolvedUrl}/about). Then save the page and click Verify below.`}
            />
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <p className="mb-2">
                We need to issue a fresh token to continue.
              </p>
              <Button
                size="sm"
                onClick={handleRegen}
                disabled={!!submitting}
                data-testid="step2-issue-fresh"
              >
                {submitting === "regen" ? <Spinner /> : "Generate token"}
              </Button>
            </div>
          )}
          <Button
            onClick={handleVerify}
            disabled={!!submitting || !vtChallenge}
            data-testid="step2-verify"
            className="w-full"
          >
            {submitting === "verify" ? <Spinner /> : "Verify now"}
          </Button>
          {actionError ? (
            <p className="text-sm text-red-600" data-testid="step2-error">
              {actionError}
            </p>
          ) : null}
        </section>

        {/* Action B — Passive: add inbound_email alias as Substack subscriber */}
        {inboundEmail ? (
          <section
            data-testid="step2-action-b"
            className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-5"
          >
            <h2 className="text-base font-semibold text-gray-900">
              2. (Optional, recommended) Add this email to your Substack
              subscribers
            </h2>
            <p className="text-sm text-gray-700">
              We auto-confirm when your next post arrives at this address.
              Helps us track that your forwarding is active. No action needed
              once it's added — confirmation is automatic.
            </p>
            <code
              data-testid="step2-inbound-email"
              className="block rounded-md bg-white border border-gray-200 px-3 py-2 font-mono text-sm text-gray-900 break-all"
            >
              {inboundEmail}
            </code>
            <ol className="text-xs text-gray-600 list-decimal pl-5 space-y-1">
              <li>
                Open Substack → Subscribers →{" "}
                <a
                  href={SUBSTACK_SUBSCRIBERS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Add subscriber
                </a>
              </li>
              <li>Enter the email above</li>
              <li>Select Paid → Complimentary</li>
              <li>Save</li>
            </ol>
          </section>
        ) : null}

        {/* Optional DNS sidebar (custom-domain Substacks only) */}
        {isOnCustomDomain ? (
          <section
            data-testid="step2-dns-sidebar"
            className="space-y-3 rounded-lg border border-gray-200 p-5"
          >
            <header className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Or: verify via DNS TXT record
              </h2>
              {!dnsChallenge ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEnableDns}
                  disabled={!!submitting}
                  data-testid="step2-dns-enable"
                >
                  {submitting === "dns_issue" ? <Spinner /> : "Enable DNS option"}
                </Button>
              ) : null}
            </header>
            <p className="text-sm text-gray-700">
              If you control your custom domain's DNS, this is a faster
              alternative to the About-page paste.
            </p>
            {dnsChallenge ? (
              <>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-800">
                      Record type:
                    </span>{" "}
                    <code className="font-mono">TXT</code>
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">Name:</span>{" "}
                    <code className="font-mono break-all">
                      {dnsChallenge.recordName}
                    </code>
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">Value:</span>{" "}
                    <code className="font-mono break-all">
                      {dnsChallenge.recordValue}
                    </code>
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">TTL:</span>{" "}
                    <code className="font-mono">{dnsChallenge.ttl}</code>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleCheckDns}
                  disabled={!!submitting}
                  data-testid="step2-dns-check"
                >
                  {submitting === "dns_check" ? <Spinner /> : "Check DNS now"}
                </Button>
              </>
            ) : null}
          </section>
        ) : null}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              setVtChallenge(null);
              setDnsChallenge(null);
              setActionError(null);
              setSoftNotice(null);
              setShowDnsOption(false);
              setViewMode("url_entry");
            }}
            className="text-xs text-gray-500 underline"
            data-testid="step2-restart"
          >
            Use a different URL
          </button>
        </div>
      </div>
    </div>
  );
}
