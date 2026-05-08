import { useCallback, useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/react';
import { useAuth } from '@/contexts/AuthContext';
import { useWizardState } from '@/hooks/useWizardState';
import { verifyOwnershipApi } from '@/lib/api';
import { URLEntryView } from './URLEntryView';
import { ActiveView } from './ActiveView';
import { SuccessView } from './SuccessView';
import type { ViewMode } from './types';
import type { UIFailure } from './FailureBanner';

// Phase 7.5 — Step2Ghost container.
//
// Mirrors Step2Beehiiv container (Phase 6.5 ship at commit 20998df)
// state machine + race-safety pattern + mount-resume probe + Sentry
// instrumentation. Ghost-specific adaptations:
//   - Field state: siteUrl + adminApiKey (vs Beehiiv's apiKey + pubId)
//     per backend GhostCredentials shape source-verified at platform_
//     native_api.ts:51-54.
//   - SuccessData shape: GAINS archiveEstimatedCount: number | null
//     prop forwarded to SuccessView for Ghost's count-aware archive
//     line copy (per design doc § 5; backend top-level field per
//     platform_native_api.ts:82-86 DirectFlipResult source-verified).
//   - DNS fallback handler: NEW for Ghost (not present in Beehiiv —
//     no DNS fallback path) per OQ-7.5-C ratification. V1 logs intent
//     to Sentry; actual dispatch to dns_txt_record method deferred
//     to Phase 7.6+ (existing flow for custom-domain Substack at
//     Phase 4 Session 4.1.4 is the implementation reference).
//   - Default failure reason fallback: 'GHOST_SERVER_ERROR' (vs
//     Beehiiv's 'BEEHIIV_API_ERROR') — most generic Ghost-side error
//     reason in the GhostVerifyReason enum (5 values: INVALID_API_KEY
//     / UNREACHABLE / BAD_KEY_FORMAT / GHOST_SERVER_ERROR / TIMEOUT
//     per ghost.ts:18-23 source-verified).
//   - setup_data persistence: ghost_site_url key (canonical input;
//     non-sensitive). admin_api_key is NEVER persisted to setup_data
//     per security hygiene (matches Beehiiv pattern of not
//     persisting api_key).
//   - Sentry tags: component: 'Step2Ghost', breadcrumb category:
//     'step2-ghost'.
//
// State machine (locked spec; identical to Beehiiv):
//   URL_ENTRY → submit → ACTIVE → success → SUCCESS → 3s timeout OR
//                                            user-click → wizard.advance({})
//   URL_ENTRY → submit → ACTIVE → failure → URL_ENTRY (banner; values preserved)
//   ACTIVE → cancel-button (3s+) → URL_ENTRY (values preserved; AbortController.abort())
//
// Container responsibilities (inherited from Beehiiv pattern):
//   - Owns AbortController; passes onCancel callback to ActiveView.
//     Signal piped through verifyOwnershipApi.runPlatformNativeApi
//     (api.ts widening at Phase 7.5 commit 1 f6a5323 accepts ghost
//     platform + GhostCredentials).
//   - Owns whitespace strip on submit.
//   - Owns failure → UIFailure mapping at the API boundary.
//   - Mount-resume probe: GET /verify-ownership; if is_verified===true,
//     render SuccessView mode='resume_stale' (minimal render,
//     immediate auto-advance).
//   - wizard.saveStepData persists ghost_site_url only (NOT
//     admin_api_key — secrets shouldn't land in setup_data per
//     security hygiene).
//
// Race safety (3 refs; identical to Beehiiv pattern preserved
// verbatim per Phase 6.5 architectural discipline):
//   - abortControllerRef: per-submit AbortController; .abort() on
//     cancel.
//   - requestIdRef: increments on submit AND on cancel; stale results
//     short-circuit at result-handler boundary (defense-in-depth
//     alongside AbortController; covers race where response returned
//     before .abort() fired).
//   - submittingRef: guards rapid double-submit during synchronous
//     render window between click → setViewMode('active').
//
// Discipline lessons inherited from Phase 6.0 + 6.5:
//   - Explicit error check on async calls (edgeFetch throws on
//     {success: false}; runPlatformNativeApi propagates that throw —
//     handler's try/catch is the surface).
//   - Frontend tests mock the API client; behavioral verification of
//     backend round-trip lives in opedd-backend Phase 7.0 commit
//     f3784eb integration test (tests/integration-platform-webhook-
//     ghost-hmac.test.ts post-deploy verification).

type SuccessData =
  | {
      mode: 'fresh';
      publicationName: string | null;
      archiveJobId: string | null;
      archiveEstimatedCount: number | null;
      webhookRegistered: boolean;
    }
  | {
      mode: 'resume_stale';
      publicationName: string | null;
    };

export function Step2Ghost() {
  const wizard = useWizardState();
  const { getAccessToken } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>('url_entry');
  const [siteUrl, setSiteUrl] = useState(() =>
    typeof wizard.setupData.ghost_site_url === 'string'
      ? (wizard.setupData.ghost_site_url as string)
      : '',
  );
  const [adminApiKey, setAdminApiKey] = useState('');
  const [failure, setFailure] = useState<UIFailure | null>(null);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  // AbortController for the in-flight verify request. Created per submit;
  // .abort() called on cancel. Stale results also short-circuited by
  // requestIdRef even if AbortController wasn't honored upstream.
  const abortControllerRef = useRef<AbortController | null>(null);

  // Request invalidation. Increments on each submit AND on cancel.
  // Async result handler short-circuits if its captured ID is stale.
  const requestIdRef = useRef(0);

  // Guards rapid double-submit during the synchronous render window
  // between click → setViewMode('active').
  const submittingRef = useRef(false);

  // ─── Mount-resume probe ─────────────────────────────────────────
  // GET /verify-ownership; if is_verified===true the publisher already
  // completed step 2 (browser-back, tab-close-during-ACTIVE-with-
  // direct-flip-completed, or other resume edge case). Skip straight
  // to SUCCESS in resume_stale mode → SuccessView immediately auto-
  // advances. Probe failure is non-blocking.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const ownership = await verifyOwnershipApi.get(token);
        if (cancelled) return;
        if (ownership.is_verified) {
          setSuccessData({ mode: 'resume_stale', publicationName: null });
          setViewMode('success');
        }
      } catch (err) {
        Sentry.addBreadcrumb({
          category: 'step2-ghost',
          level: 'warning',
          message: 'mount probe failed',
          data: { error: String(err).slice(0, 120) },
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken]);

  // ─── Submit handler ─────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setFailure(null);

    const trimmedSiteUrl = siteUrl.trim();
    const trimmedAdminApiKey = adminApiKey.trim();

    if (!trimmedSiteUrl || !trimmedAdminApiKey) {
      // Defensive — button is disabled when either field is empty.
      // Reaches here only via programmatic submit edge case.
      setFailure({ kind: 'invalid_payload' });
      submittingRef.current = false;
      return;
    }

    // Persist site_url (not admin_api_key) for resume on browser
    // refresh / back-navigation. Best-effort; failure breadcrumb only.
    try {
      await wizard.saveStepData({ ghost_site_url: trimmedSiteUrl });
    } catch (err) {
      Sentry.addBreadcrumb({
        category: 'step2-ghost',
        level: 'warning',
        message: 'saveStepData failed',
        data: { error: String(err).slice(0, 120) },
      });
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setViewMode('active');

    try {
      const token = await getAccessToken();
      const result = await verifyOwnershipApi.runPlatformNativeApi(
        'ghost',
        { site_url: trimmedSiteUrl, admin_api_key: trimmedAdminApiKey },
        token,
        controller.signal,
      );

      // Stale-response check: cancel increments requestIdRef.
      if (requestId !== requestIdRef.current) return;

      if (result.verified) {
        // Discriminated-union evidence access: Ghost branch carries
        // publication_name (no pub_id, no web_url — per backend
        // platform_native_api.ts:179-183 source-verified).
        const publicationName =
          result.evidence && result.evidence.platform === 'ghost'
            ? result.evidence.publication_name
            : null;
        setSuccessData({
          mode: 'fresh',
          publicationName,
          archiveJobId: result.archive_job_id ?? null,
          archiveEstimatedCount: result.archive_estimated_count ?? null,
          webhookRegistered: result.webhook_registered ?? false,
        });
        setViewMode('success');
      } else {
        // Backend returned verified=false with a reason. Map to
        // UIFailure shape; banner copy + field highlight derived
        // from FailureBanner.deriveBannerCopy. Pass through
        // fallback_available so FailureBanner can conditionally
        // render the DNS TXT fallback link (per OQ-7.5-C +
        // backend platform_native_api.ts dual-condition gate).
        setFailure({
          kind: 'verify_failed',
          reason: result.reason ?? 'GHOST_SERVER_ERROR',
          fallback_available: result.fallback_available,
        });
        setViewMode('url_entry');
      }
    } catch (err) {
      // Stale-response or abort: short-circuit.
      if (requestId !== requestIdRef.current) return;

      // AbortError on the AbortController.signal path — handled the
      // same as stale-response (publisher already saw URL_ENTRY).
      if (err instanceof DOMException && err.name === 'AbortError') return;

      // Discriminate: 400 INVALID_PAYLOAD (defensive — should be guarded
      // by trim check above + button-disabled UX) vs 5xx / network.
      const msg = err instanceof Error ? err.message : '';
      if (/INVALID_PAYLOAD|site_url.*required|admin_api_key.*required/i.test(msg)) {
        setFailure({ kind: 'invalid_payload' });
      } else {
        setFailure({ kind: 'internal_error' });
        Sentry.captureException(err, {
          tags: { component: 'Step2Ghost', phase: 'verify_ownership' },
        });
      }
      setViewMode('url_entry');
    } finally {
      submittingRef.current = false;
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [siteUrl, adminApiKey, getAccessToken, wizard]);

  // ─── Cancel handler ─────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    Sentry.addBreadcrumb({
      category: 'step2-ghost',
      level: 'info',
      message: 'cancel during ACTIVE',
    });
    // Invalidate any in-flight response.
    requestIdRef.current++;
    submittingRef.current = false;
    // Abort the fetch.
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    // Return to URL_ENTRY; values preserved (siteUrl / adminApiKey
    // state untouched).
    setViewMode('url_entry');
  }, []);

  // ─── Wizard advance handler ─────────────────────────────────────
  const handleAdvance = useCallback(async () => {
    try {
      await wizard.advance({});
    } catch (err) {
      Sentry.captureException(err, {
        tags: { component: 'Step2Ghost', phase: 'wizard_advance' },
      });
    }
  }, [wizard]);

  // ─── DNS fallback handler ───────────────────────────────────────
  // Phase 7.5 v1 placeholder — logs intent to Sentry without
  // dispatching the actual dns_txt_record flow. Per OQ-7.5-C
  // ratification ("every failed attempt; one-line link is
  // low-friction") the link surfaces in FailureBanner for
  // UNREACHABLE / GHOST_SERVER_ERROR / TIMEOUT failures when backend
  // signals fallback_available='dns_txt_record'. v1 captures click
  // intent so we know whether real publishers attempt the path
  // before investing in full dispatch wiring.
  //
  // Phase 7.6+ scope: wire actual dispatch to dns_txt_record method
  // (existing flow for custom-domain Substack at Phase 4 Session
  // 4.1.4 — verifyOwnershipApi has dns_txt_record action helpers
  // around api.ts:455-466). Wiring requires sub-component swap or
  // wizard-state route change; outside Phase 7.5 commit-6 scope.
  const handleFallbackClick = useCallback(() => {
    const reason =
      failure && failure.kind === 'verify_failed' ? failure.reason : 'unknown';
    Sentry.addBreadcrumb({
      category: 'step2-ghost',
      level: 'info',
      message: 'dns fallback link clicked',
      data: { reason: String(reason).slice(0, 60) },
    });
    Sentry.captureMessage('Step2Ghost DNS fallback intent (v1 placeholder)', {
      tags: { component: 'Step2Ghost', phase: 'dns_fallback_intent' },
      level: 'info',
    });
  }, [failure]);

  // ─── View dispatch ──────────────────────────────────────────────
  if (viewMode === 'success' && successData) {
    if (successData.mode === 'fresh') {
      return (
        <SuccessView
          mode="fresh"
          publicationName={successData.publicationName}
          archiveJobId={successData.archiveJobId}
          archiveEstimatedCount={successData.archiveEstimatedCount}
          webhookRegistered={successData.webhookRegistered}
          onAdvance={handleAdvance}
        />
      );
    }
    return (
      <SuccessView
        mode="resume_stale"
        publicationName={successData.publicationName}
        onAdvance={handleAdvance}
      />
    );
  }

  if (viewMode === 'active') {
    return (
      <ActiveView
        siteUrl={siteUrl}
        adminApiKey={adminApiKey}
        onCancel={handleCancel}
      />
    );
  }

  // Default: url_entry
  return (
    <URLEntryView
      siteUrl={siteUrl}
      adminApiKey={adminApiKey}
      onSiteUrlChange={setSiteUrl}
      onAdminApiKeyChange={setAdminApiKey}
      onSubmit={handleSubmit}
      isSubmitting={false}
      failure={failure}
      onFallbackClick={handleFallbackClick}
    />
  );
}
