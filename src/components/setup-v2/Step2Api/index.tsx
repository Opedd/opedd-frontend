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

// Step2Api container — Custom API onboarding path. Creates a publisher
// API key via /publishers-api-keys; the key creation IS the verification
// act per Phase 8.7 verification-flip cascade ("API-key-as-proof").
//
// Field state: name (optional string).
// Backend call: publisherApi.createApiKey (POST /publishers-api-keys
// action=create_api_key); session-JWT-authed.
// SuccessData shape: plaintext key + key prefix + optional name.
// Plaintext NEVER persisted to setup_data; the prefix + id are.
// Mount-resume probe: publisherApi.listApiKeys; if a non-revoked key
// matches setup_data.api_key_id, render SuccessView mode='resume_stale'
// (publisher's plaintext is gone but their key exists).
//
// State machine:
//   URL_ENTRY → submit → ACTIVE → success → SUCCESS → user-click → advance
//   URL_ENTRY → submit → ACTIVE → failure → URL_ENTRY (banner)
//   ACTIVE → cancel → URL_ENTRY (values preserved; AbortController.abort)

type SuccessData =
  | {
      mode: 'fresh';
      plaintextKey: string;
      keyPrefix: string;
      name?: string;
    }
  | {
      mode: 'resume_stale';
      keyPrefix: string;
    };

interface SetupDataAuthSlice {
  api_key_id?: string;
  api_key_prefix?: string;
}

export function Step2Api() {
  const wizard = useWizardState();
  const { getAccessToken } = useAuth();

  const setupDataAuth = wizard.setupData as SetupDataAuthSlice;

  const [viewMode, setViewMode] = useState<ViewMode>('url_entry');
  const [name, setName] = useState('');
  const [failure, setFailure] = useState<UIFailure | null>(null);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const submittingRef = useRef(false);
  // Phase 11.5 Step 9 Q3 follow-on (2026-05-18) — probe-race guard.
  // Set to true inside handleSubmit AFTER createApiKey succeeds and
  // BEFORE wizard.saveStepData propagates the api_key_id into setup_data.
  // The mount-resume probe below depends on setupDataAuth.api_key_id;
  // without this guard, saveStepData populating api_key_id mid-render
  // would fire the probe, which would overwrite successData mode='fresh'
  // with mode='resume_stale' → SuccessView.tsx:73-77 auto-triggerAdvance
  // → wizard advances Step 2 → Step 3 → SuccessView unmounts before the
  // publisher copies the key. Sibling-of-Fix-B miss (M7.1.1 invariant
  // class: don't conflate "key exists in setup_data" with "publisher
  // is in resume mode"). See INVARIANTS.md Phase 9.4 reversion entry
  // for the cross-reference.
  const justSubmittedInSessionRef = useRef(false);

  // Mount-resume probe: if setup_data.api_key_id is present, verify a
  // matching non-revoked key still exists. If so, skip to SuccessView
  // mode='resume_stale' (no plaintext available).
  useEffect(() => {
    // Skip the probe entirely when the publisher just submitted in this
    // session — they're looking at the fresh-reveal SuccessView with
    // their plaintext key; the saveStepData call that populated api_key_id
    // is what triggered this useEffect, not a genuine resume case.
    if (justSubmittedInSessionRef.current) return;
    if (!setupDataAuth.api_key_id) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const result = await publisherApi.listApiKeys(token);
        if (cancelled) return;
        const matching = result.api_keys.find(
          (k) => k.id === setupDataAuth.api_key_id && k.revoked_at === null,
        );
        if (matching) {
          setSuccessData({
            mode: 'resume_stale',
            keyPrefix: matching.key_prefix,
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

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setFailure(null);

    const trimmedName = name.trim();
    const effectiveName = trimmedName.length > 0 ? trimmedName : 'Onboarding key';

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setViewMode('active');

    try {
      const token = await getAccessToken();
      const result = await publisherApi.createApiKey(
        { name: effectiveName },
        token,
      );

      if (requestId !== requestIdRef.current) return;

      // Probe-race guard (see useRef declaration above). Must be set
      // BEFORE saveStepData runs — saveStepData's wizard-hook cache
      // update propagates synchronously into setupDataAuth.api_key_id
      // and would otherwise fire the mount-resume probe mid-render.
      justSubmittedInSessionRef.current = true;

      try {
        await wizard.saveStepData({
          api_key_id: result.id,
          api_key_prefix: result.key_prefix,
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
        plaintextKey: result.plaintext_key,
        keyPrefix: result.key_prefix,
        name: result.name,
      });
      setViewMode('success');
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;

      const msg = err instanceof Error ? err.message : '';
      if (/VALIDATION_FAILED|Invalid input/i.test(msg)) {
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
  }, [name, getAccessToken, wizard]);

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

  const handleAdvance = useCallback(async () => {
    try {
      await wizard.advance({});
    } catch (err) {
      Sentry.captureException(err, {
        tags: { component: 'Step2Api', phase: 'wizard_advance' },
      });
    }
  }, [wizard]);

  if (viewMode === 'success' && successData) {
    if (successData.mode === 'fresh') {
      return (
        <SuccessView
          mode="fresh"
          plaintextKey={successData.plaintextKey}
          keyPrefix={successData.keyPrefix}
          name={successData.name}
          onAdvance={handleAdvance}
        />
      );
    }
    return (
      <SuccessView
        mode="resume_stale"
        keyPrefix={successData.keyPrefix}
        onAdvance={handleAdvance}
      />
    );
  }

  if (viewMode === 'active') {
    return (
      <ActiveView
        name={name}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <URLEntryView
      name={name}
      onNameChange={setName}
      onSubmit={handleSubmit}
      isSubmitting={false}
      failure={failure}
    />
  );
}
