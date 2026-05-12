import { useCallback, useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/react';
import { useAuth } from '@/contexts/AuthContext';
import { useWizardState } from '@/hooks/useWizardState';
import { publisherApi } from '@/lib/api';
import { URLEntryView } from './URLEntryView';
import { ActiveView } from './ActiveView';
import { SuccessView } from './SuccessView';
import type { ViewMode } from './types';
import type { UIFailure } from './FailureBanner';

// Phase 8.6 — Step2Api container.
//
// Mirrors Step2Ghost container (Phase 7.5 ship) state machine + race-
// safety pattern + mount-resume probe + Sentry instrumentation.
// Step2Api-specific adaptations:
//   - Field state: environment ('test' | 'live'; default 'test') +
//     name (optional string). NOT siteUrl/adminApiKey/apiKey/pubId.
//   - Backend call: publisherApi.createApiKey (POST /publishers-api-
//     keys action=create_api_key) instead of verifyOwnershipApi.run
//     PlatformNativeApi. Session-JWT-authed (chicken-and-egg
//     avoidance per Phase 8.0.1 self-management carve-out).
//   - SuccessData shape: plaintext key + key prefix + environment +
//     optional name. Plaintext NEVER persisted to setup_data; the
//     prefix + id + environment are persisted so resume works.
//   - Mount-resume probe: publisherApi.listApiKeys; if a non-revoked
//     key matches setup_data.api_key_id, render SuccessView mode=
//     'resume_stale' (publisher's plaintext is gone but their key
//     exists — skip to immediate auto-advance).
//   - setup_data persistence: api_key_id (uuid) + api_key_prefix
//     (12 chars; non-sensitive) + api_environment ('test' | 'live').
//     Plaintext key NEVER persisted.
//   - Sentry tags: component: 'Step2Api', breadcrumb category:
//     'step2-api'.
//
// State machine (locked spec; identical to Ghost):
//   URL_ENTRY → submit → ACTIVE → success → SUCCESS → 6s timeout OR
//                                            user-click → wizard.advance({})
//   URL_ENTRY → submit → ACTIVE → failure → URL_ENTRY (banner; values preserved)
//   ACTIVE → cancel-button (3s+) → URL_ENTRY (values preserved; AbortController.abort())
//
// Race safety (3 refs; identical to Ghost pattern preserved verbatim):
//   - abortControllerRef: per-submit AbortController; .abort() on cancel.
//   - requestIdRef: increments on submit AND on cancel; stale results
//     short-circuit at result-handler boundary.
//   - submittingRef: guards rapid double-submit during synchronous
//     render window between click → setViewMode('active').

type SuccessData =
  | {
      mode: 'fresh';
      plaintextKey: string;
      keyPrefix: string;
      environment: 'live' | 'test';
      name?: string;
    }
  | {
      mode: 'resume_stale';
      keyPrefix: string;
      environment: 'live' | 'test';
    };

interface SetupDataAuthSlice {
  api_key_id?: string;
  api_key_prefix?: string;
  api_environment?: 'live' | 'test';
}

export function Step2Api() {
  const wizard = useWizardState();
  const { getAccessToken } = useAuth();

  const setupDataAuth = wizard.setupData as SetupDataAuthSlice;

  const [viewMode, setViewMode] = useState<ViewMode>('url_entry');
  const [environment, setEnvironment] = useState<'live' | 'test'>(
    () => setupDataAuth.api_environment ?? 'test',
  );
  const [name, setName] = useState('');
  const [failure, setFailure] = useState<UIFailure | null>(null);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const submittingRef = useRef(false);

  // ─── Mount-resume probe ─────────────────────────────────────────
  // If setup_data.api_key_id is present, fetch the publisher's key
  // list + verify a matching non-revoked key still exists. If so,
  // skip to SuccessView mode='resume_stale' (no plaintext available;
  // immediate auto-advance). Probe failure is non-blocking (logs
  // breadcrumb only — publisher can re-create a key from URL_ENTRY).
  useEffect(() => {
    if (!setupDataAuth.api_key_id) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const result = await publisherApi.listApiKeys(token);
        if (cancelled) return;
        const matching = result.keys.find(
          (k) => k.id === setupDataAuth.api_key_id && k.revoked_at === null,
        );
        if (matching) {
          setSuccessData({
            mode: 'resume_stale',
            keyPrefix: matching.key_prefix,
            environment: matching.environment,
          });
          setViewMode('success');
        }
      } catch (err) {
        Sentry.addBreadcrumb({
          category: 'step2-api',
          level: 'warning',
          message: 'mount probe failed',
          data: { error: String(err).slice(0, 120) },
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken, setupDataAuth.api_key_id]);

  // ─── Submit handler ─────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setFailure(null);

    if (environment !== 'test' && environment !== 'live') {
      setFailure({ kind: 'invalid_payload' });
      submittingRef.current = false;
      return;
    }

    const trimmedName = name.trim();
    const effectiveName = trimmedName.length > 0 ? trimmedName : 'Onboarding key';

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setViewMode('active');

    try {
      const token = await getAccessToken();
      // Note: publisherApi.createApiKey does NOT accept AbortSignal in
      // its current shape (edgeFetch helper doesn't thread signal in
      // the publisherApi namespace). cancel-during-active surfaces in
      // the UI via setViewMode('url_entry') but the in-flight fetch
      // completes naturally; stale result short-circuited by
      // requestIdRef check below.
      const result = await publisherApi.createApiKey(
        { environment, name: effectiveName },
        token,
      );

      if (requestId !== requestIdRef.current) return;

      // Persist non-sensitive fields to setup_data for resume support.
      // Plaintext key NEVER persisted per security hygiene.
      try {
        await wizard.saveStepData({
          api_key_id: result.id,
          api_key_prefix: result.key_prefix,
          api_environment: result.environment,
        });
      } catch (err) {
        Sentry.addBreadcrumb({
          category: 'step2-api',
          level: 'warning',
          message: 'saveStepData failed',
          data: { error: String(err).slice(0, 120) },
        });
      }

      setSuccessData({
        mode: 'fresh',
        plaintextKey: result.key,
        keyPrefix: result.key_prefix,
        environment: result.environment,
        name: result.name,
      });
      setViewMode('success');
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;

      const msg = err instanceof Error ? err.message : '';
      // Discriminate Phase 8 error codes from the thrown message
      // (edgeFetch surfaces `error.message` on Phase 8 failures).
      if (/VALIDATION_FAILED|Invalid input|environment/i.test(msg)) {
        setFailure({ kind: 'create_failed', code: 'VALIDATION_FAILED' });
      } else if (/UNAUTHORIZED|No authorization|Invalid or expired/i.test(msg)) {
        setFailure({ kind: 'create_failed', code: 'UNAUTHORIZED' });
      } else if (/RATE_LIMITED|Rate limit/i.test(msg)) {
        setFailure({ kind: 'create_failed', code: 'RATE_LIMITED' });
      } else {
        setFailure({ kind: 'internal_error' });
        Sentry.captureException(err, {
          tags: { component: 'Step2Api', phase: 'create_api_key' },
        });
      }
      setViewMode('url_entry');
    } finally {
      submittingRef.current = false;
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [environment, name, getAccessToken, wizard]);

  // ─── Cancel handler ─────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    Sentry.addBreadcrumb({
      category: 'step2-api',
      level: 'info',
      message: 'cancel during ACTIVE',
    });
    requestIdRef.current++;
    submittingRef.current = false;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setViewMode('url_entry');
  }, []);

  // ─── Wizard advance handler ─────────────────────────────────────
  const handleAdvance = useCallback(async () => {
    try {
      await wizard.advance({});
    } catch (err) {
      Sentry.captureException(err, {
        tags: { component: 'Step2Api', phase: 'wizard_advance' },
      });
    }
  }, [wizard]);

  // ─── View dispatch ──────────────────────────────────────────────
  if (viewMode === 'success' && successData) {
    if (successData.mode === 'fresh') {
      return (
        <SuccessView
          mode="fresh"
          plaintextKey={successData.plaintextKey}
          keyPrefix={successData.keyPrefix}
          environment={successData.environment}
          name={successData.name}
          onAdvance={handleAdvance}
        />
      );
    }
    return (
      <SuccessView
        mode="resume_stale"
        keyPrefix={successData.keyPrefix}
        environment={successData.environment}
        onAdvance={handleAdvance}
      />
    );
  }

  if (viewMode === 'active') {
    return (
      <ActiveView
        environment={environment}
        name={name}
        onCancel={handleCancel}
      />
    );
  }

  // Default: url_entry
  return (
    <URLEntryView
      environment={environment}
      name={name}
      onEnvironmentChange={setEnvironment}
      onNameChange={setName}
      onSubmit={handleSubmit}
      isSubmitting={false}
      failure={failure}
    />
  );
}
