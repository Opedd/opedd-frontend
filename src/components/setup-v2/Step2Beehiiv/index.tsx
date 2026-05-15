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

// Phase 6.5 — Step2Beehiiv container.
//
// State machine (locked spec):
//   URL_ENTRY → submit → ACTIVE → success → SUCCESS → 3s timeout OR
//                                            user-click → wizard.advance({})
//   URL_ENTRY → submit → ACTIVE → failure → URL_ENTRY (banner; values preserved)
//   ACTIVE → cancel-button (3s+) → URL_ENTRY (values preserved; AbortController.abort())
//
// Container responsibilities:
//   - Owns AbortController; passes onCancel callback to ActiveView. Signal
//     piped through verifyOwnershipApi.runPlatformNativeApi (commit 1
//     extended to accept optional signal).
//   - Owns whitespace strip on submit (per CHECKPOINT 1 OQ-1).
//   - Owns failure → UIFailure mapping at the API boundary (per
//     CHECKPOINT 2 reminder).
//   - Mount-resume probe: GET /verify-ownership; if is_verified===true,
//     render SuccessView mode='resume_stale' (per CHECKPOINT 1 OQ-3 —
//     minimal render, immediate auto-advance).
//   - wizard.saveStepData persists beehiiv_pub_id only (NOT api_key —
//     secrets shouldn't land in setup_data per security hygiene).
//   - Sentry: tags { component: 'Step2Beehiiv', phase: 'verify_ownership' |
//     'mount' | 'cancel' | 'wizard_advance' | 'save_step_data' }.
//
// Discipline lessons inherited from Phase 6.0:
//   - Explicit error check on async calls (edgeFetch throws on
//     {success: false}; runPlatformNativeApi propagates that throw —
//     handler's try/catch is the surface).
//   - Frontend tests mock the API client; behavioral verification of
//     backend round-trip lives in opedd-backend Phase 6.0 commit 9
//     integration tests.

type SuccessData =
  | {
      mode: 'fresh';
      publicationName: string | null;
      archiveJobId: string | null;
      webhookRegistered: boolean;
    }
  | {
      mode: 'resume_stale';
      publicationName: string | null;
    };

// Phase 11 M7.1 — optional add-newsletter mode (Dashboard re-entry path).
// When `onCompletionRedirect` is provided, the component (a) skips the
// mount-resume probe so already-verified publishers see the form, (b) skips
// pre-fill from wizard.setupData so the input starts fresh, (c) skips
// saveStepData (don't overwrite original pub_id), and (d) calls
// onCompletionRedirect on success instead of wizard.advance. Verification
// state-machine logic is unchanged.
interface Step2BeehiivProps {
  onCompletionRedirect?: () => void;
}

export function Step2Beehiiv({ onCompletionRedirect }: Step2BeehiivProps = {}) {
  const wizard = useWizardState();
  const { getAccessToken } = useAuth();
  const isAddNewsletterMode = Boolean(onCompletionRedirect);

  const [viewMode, setViewMode] = useState<ViewMode>('url_entry');
  const [apiKey, setApiKey] = useState('');
  const [pubId, setPubId] = useState(() => {
    if (isAddNewsletterMode) return '';
    return typeof wizard.setupData.beehiiv_pub_id === 'string'
      ? (wizard.setupData.beehiiv_pub_id as string)
      : '';
  });
  const [failure, setFailure] = useState<UIFailure | null>(null);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  // AbortController for the in-flight verify request. Created per submit;
  // .abort() called on cancel. Stale results also short-circuited by
  // requestIdRef even if AbortController wasn't honored upstream.
  const abortControllerRef = useRef<AbortController | null>(null);

  // Request invalidation. Increments on each submit AND on cancel.
  // Async result handler short-circuits if its captured ID is stale
  // (defense-in-depth alongside AbortController; covers the case where
  // the network response had already returned before .abort() fired).
  const requestIdRef = useRef(0);

  // Guards rapid double-submit during the synchronous render window
  // between click → setViewMode('active'). Without this, two clicks
  // before React re-renders both fire handleSubmit.
  const submittingRef = useRef(false);

  // ─── Mount-resume probe ─────────────────────────────────────────
  // GET /verify-ownership; if is_verified===true the publisher already
  // completed step 2 (browser-back, tab-close-during-ACTIVE-with-
  // direct-flip-completed, or other resume edge case). Skip straight
  // to SUCCESS in resume_stale mode → SuccessView immediately auto-
  // advances. Probe failure is non-blocking; publisher can still
  // submit normally.
  useEffect(() => {
    // Phase 11 M7.1: in add-newsletter mode the publisher is already
    // verified — the probe would auto-skip the form. Skip the probe.
    if (isAddNewsletterMode) return;
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
          category: 'step2-beehiiv',
          level: 'warning',
          message: 'mount probe failed',
          data: { error: String(err).slice(0, 120) },
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken, isAddNewsletterMode]);

  // ─── Submit handler ─────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setFailure(null);

    const trimmedApiKey = apiKey.trim();
    const trimmedPubId = pubId.trim();

    if (!trimmedApiKey || !trimmedPubId) {
      // Defensive — button is disabled when either field is empty.
      // Reaches here only via programmatic submit edge case.
      setFailure({ kind: 'invalid_payload' });
      submittingRef.current = false;
      return;
    }

    // Persist pub_id (not api_key) for resume on browser refresh /
    // back-navigation. Best-effort; failure breadcrumb only.
    // Phase 11 M7.1: in add-newsletter mode, skip saveStepData so the
    // original pub_id in setup_data is preserved.
    if (!isAddNewsletterMode) {
      try {
        await wizard.saveStepData({ beehiiv_pub_id: trimmedPubId });
      } catch (err) {
        Sentry.addBreadcrumb({
          category: 'step2-beehiiv',
          level: 'warning',
          message: 'saveStepData failed',
          data: { error: String(err).slice(0, 120) },
        });
      }
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setViewMode('active');

    try {
      const token = await getAccessToken();
      const result = await verifyOwnershipApi.runPlatformNativeApi(
        'beehiiv',
        { api_key: trimmedApiKey, pub_id: trimmedPubId },
        token,
        controller.signal,
      );

      // Stale-response check: cancel increments requestIdRef.
      if (requestId !== requestIdRef.current) return;

      if (result.verified) {
        setSuccessData({
          mode: 'fresh',
          publicationName: result.evidence?.publication_name ?? null,
          archiveJobId: result.archive_job_id ?? null,
          webhookRegistered: result.webhook_registered ?? false,
        });
        setViewMode('success');
      } else {
        // Backend returned verified=false with a reason. Map to
        // UIFailure shape; banner copy + field highlight derived
        // from FailureBanner.deriveBannerCopy.
        setFailure({
          kind: 'verify_failed',
          reason: result.reason ?? 'BEEHIIV_API_ERROR',
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
      if (/INVALID_PAYLOAD|api_key.*required|pub_id.*required/i.test(msg)) {
        setFailure({ kind: 'invalid_payload' });
      } else {
        setFailure({ kind: 'internal_error' });
        Sentry.captureException(err, {
          tags: { component: 'Step2Beehiiv', phase: 'verify_ownership' },
        });
      }
      setViewMode('url_entry');
    } finally {
      submittingRef.current = false;
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [apiKey, pubId, getAccessToken, wizard]);

  // ─── Cancel handler ─────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    Sentry.addBreadcrumb({
      category: 'step2-beehiiv',
      level: 'info',
      message: 'cancel during ACTIVE',
    });
    // Invalidate any in-flight response.
    requestIdRef.current++;
    submittingRef.current = false;
    // Abort the fetch.
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    // Return to URL_ENTRY; values preserved (apiKey / pubId state untouched).
    setViewMode('url_entry');
  }, []);

  // ─── Wizard advance handler ─────────────────────────────────────
  const handleAdvance = useCallback(async () => {
    // Phase 11 M7.1: in add-newsletter mode, redirect to Dashboard
    // instead of advancing wizard step.
    if (onCompletionRedirect) {
      onCompletionRedirect();
      return;
    }
    try {
      await wizard.advance({});
    } catch (err) {
      Sentry.captureException(err, {
        tags: { component: 'Step2Beehiiv', phase: 'wizard_advance' },
      });
    }
  }, [wizard, onCompletionRedirect]);

  // ─── View dispatch ──────────────────────────────────────────────
  if (viewMode === 'success' && successData) {
    if (successData.mode === 'fresh') {
      return (
        <SuccessView
          mode="fresh"
          publicationName={successData.publicationName}
          archiveJobId={successData.archiveJobId}
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
    return <ActiveView apiKey={apiKey} pubId={pubId} onCancel={handleCancel} />;
  }

  // Default: url_entry
  return (
    <URLEntryView
      apiKey={apiKey}
      pubId={pubId}
      onApiKeyChange={setApiKey}
      onPubIdChange={setPubId}
      onSubmit={handleSubmit}
      isSubmitting={false}
      failure={failure}
    />
  );
}
