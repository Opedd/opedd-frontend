import { useCallback, useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import { useAuth } from "@/contexts/AuthContext";
import {
  wizardStateApi,
  WizardStateError,
  type SetupState,
  type WizardStateView,
  type WizardStep,
} from "@/lib/api";

/**
 * Phase 1 Session 1.3 — client-side WizardStateMachine.
 *
 * Hook for the publisher onboarding wizard. Wraps the wizard-state
 * edge function (Phase 1 Session 1.2) with React Query for cache,
 * subscription, and mutation lifecycle, plus a localStorage fallback
 * for offline tolerance.
 *
 * Contract surface mirrors WizardStateView from the backend
 * (supabase/functions/wizard-state/types.ts in opedd-backend).
 *
 * First consumer: Phase 3 Session 3.1 (SetupV2.tsx). The legacy
 * Setup.tsx wizard was unreachable from app routing as of Session 3.1
 * (App.tsx /setup → /setup-v2 redirect) and was deleted in Session 3.7.
 *
 * Key behaviors:
 *   - Cache hydrate: localStorage placeholder → background GET → write-through
 *   - CAS conflict (STATE_MISMATCH): refetch in background, throw to caller.
 *     Does NOT auto-replay — replaying after state drift can silently
 *     double-advance. Caller decides what to do with the fresh state.
 *   - Forbidden transitions (REGRESS_FORBIDDEN, TERMINAL_STATE, SUSPENDED):
 *     bubble untouched. No refetch fired (these aren't staleness errors).
 *   - All actions server-confirmed. No optimistic updates.
 *   - publisher row not found (404): surfaced as a typed error. Caller
 *     should ensure publisher-profile GET has run first; the hook does
 *     not auto-create.
 */

const QUERY_KEY_BASE = ["wizard-state"] as const;
const CACHE_KEY_PREFIX = "opedd:wizard-state:v1:";

function cacheKeyFor(userId: string): string {
  return CACHE_KEY_PREFIX + userId;
}

function readCache(userId: string): WizardStateView | null {
  try {
    const raw = localStorage.getItem(cacheKeyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Defensive shape check: parsed.publisher_id + setup_state must be
    // present and stringy; everything else is allowed to drift across
    // versions because the next GET overwrites.
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.publisher_id === "string" &&
      typeof parsed.setup_state === "string"
    ) {
      return parsed as WizardStateView;
    }
    return null;
  } catch (err) {
    // Corrupt cache. Breadcrumb so repeated corruption for the same
    // user shows up in Sentry; not an error event because no PII and
    // recovery is automatic (the GET will repopulate). Per Session 1.3
    // refinement #2.
    Sentry.addBreadcrumb({
      category: "wizard-state",
      level: "warning",
      message: "Corrupt localStorage cache; ignoring",
      data: { user_id_hash: hashId(userId), error: String(err).slice(0, 120) },
    });
    return null;
  }
}

function writeCache(userId: string, view: WizardStateView): void {
  try {
    localStorage.setItem(cacheKeyFor(userId), JSON.stringify(view));
  } catch (err) {
    // Quota errors are real (private windows, full disks). Breadcrumb
    // so a sudden quota wave is visible; the hook keeps working — the
    // server is the truth, cache is purely an offline paint. Per
    // Session 1.3 refinement #2.
    Sentry.addBreadcrumb({
      category: "wizard-state",
      level: "warning",
      message: "localStorage write failed (likely quota)",
      data: { user_id_hash: hashId(userId), error: String(err).slice(0, 120) },
    });
  }
}

function clearCache(userId: string): void {
  try {
    localStorage.removeItem(cacheKeyFor(userId));
  } catch {
    // ignore — quota / private window / disabled storage
  }
}

// Cheap non-cryptographic hash so we can see whether breadcrumbs cluster
// to a single user without exposing the user_id itself.
function hashId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

export interface UseWizardStateResult {
  // Current state — null until first hydration completes (cache OR network).
  state: WizardStateView | null;

  // Derived shortcuts — null when state is null.
  setupState: SetupState | null;
  currentStep: WizardStep | null;
  setupData: Record<string, unknown>;
  dormant: boolean;
  canAdvance: boolean;
  canRegress: boolean;
  nextStep: WizardStep | null;
  prevStep: WizardStep | null;

  // Status flags.
  isLoading: boolean;
  isFetching: boolean;
  isMutating: boolean;
  isOffline: boolean;
  error: WizardStateError | null;

  // Actions.
  advance: (
    stepData?: Record<string, unknown>
  ) => Promise<WizardStateView>;
  regress: () => Promise<WizardStateView>;
  saveStepData: (
    patch: Record<string, unknown>
  ) => Promise<WizardStateView>;
  refetch: () => Promise<WizardStateView | null>;
}

export function useWizardState(): UseWizardStateResult {
  const { user, getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const queryKey = useMemo(
    () => (userId ? [...QUERY_KEY_BASE, userId] : QUERY_KEY_BASE),
    [userId]
  );

  // initialData seeds React Query's cache as if a fetch had succeeded
  // at `initialDataUpdatedAt` — using 0 marks it instantly stale so the
  // refetch fires immediately. Critical difference vs placeholderData:
  // initialData persists across error states, so a failed GET still
  // leaves state populated from the cache (drives the isOffline flag).
  // useMemo keyed by userId so we don't re-read localStorage every paint.
  const initial = useMemo(() => {
    if (!userId) return undefined;
    return readCache(userId) ?? undefined;
  }, [userId]);

  const query = useQuery<WizardStateView, WizardStateError>({
    queryKey,
    enabled: !!userId,
    initialData: initial,
    initialDataUpdatedAt: 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: (failureCount, err) => {
      // Don't retry 4xx — they're terminal contracts (auth, payload,
      // forbidden transitions, not-found, CAS). Retry network/5xx once.
      if (err instanceof WizardStateError && err.status >= 400 && err.status < 500) {
        return false;
      }
      return failureCount < 1;
    },
    queryFn: async () => {
      const token = await getAccessToken();
      const view = await wizardStateApi.get(token);
      if (userId) writeCache(userId, view);
      return view;
    },
  });

  // Derive observable state from query. The placeholder slot makes
  // `query.data` available synchronously when localStorage has a hit.
  const state = (query.data ?? null) as WizardStateView | null;
  const error = (query.error as WizardStateError | null) ?? null;

  // isOffline: we're displaying state (from cache or a prior success)
  // AND the most recent network attempt failed. Distinguishes "first
  // paint, no cache yet" (isLoading) from "showing cached state because
  // the network is down" (isOffline).
  const isOffline = !!query.error && !!state;

  // ─── Mutations ──────────────────────────────────────────────────
  // Each mutation reads the CAS preconditions from the cached `state`,
  // not from caller arguments. Caller doesn't have to know the
  // expected_state/step — the hook owns it.

  const onMutationError = useCallback(
    (err: unknown) => {
      if (err instanceof WizardStateError && err.code === "STATE_MISMATCH") {
        // Server moved out from under us (concurrent tab, tab restored
        // from suspend, etc.). Refresh the cache in the background;
        // bubble to caller so the UI can react. Do NOT auto-replay.
        queryClient.invalidateQueries({ queryKey });
      }
    },
    [queryClient, queryKey]
  );

  const advanceMutation = useMutation<
    WizardStateView,
    WizardStateError,
    Record<string, unknown> | undefined
  >({
    mutationFn: async (stepData) => {
      if (!state) {
        throw new WizardStateError(
          "Cannot advance before wizard state has loaded",
          "INVALID_PAYLOAD",
          400
        );
      }
      const token = await getAccessToken();
      return wizardStateApi.advance(
        {
          expected_state: state.setup_state,
          expected_step: state.setup_step,
          ...(stepData !== undefined ? { step_data: stepData } : {}),
        },
        token
      );
    },
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
      if (userId) writeCache(userId, next);
    },
    onError: onMutationError,
  });

  const regressMutation = useMutation<
    WizardStateView,
    WizardStateError,
    void
  >({
    mutationFn: async () => {
      if (!state) {
        throw new WizardStateError(
          "Cannot regress before wizard state has loaded",
          "INVALID_PAYLOAD",
          400
        );
      }
      const token = await getAccessToken();
      return wizardStateApi.regress(
        {
          expected_state: state.setup_state,
          expected_step: state.setup_step,
        },
        token
      );
    },
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
      if (userId) writeCache(userId, next);
    },
    onError: onMutationError,
  });

  const saveStepDataMutation = useMutation<
    WizardStateView,
    WizardStateError,
    Record<string, unknown>
  >({
    mutationFn: async (patch) => {
      if (!state) {
        throw new WizardStateError(
          "Cannot save step data before wizard state has loaded",
          "INVALID_PAYLOAD",
          400
        );
      }
      const token = await getAccessToken();
      return wizardStateApi.saveStepData(
        {
          expected_state: state.setup_state,
          expected_step: state.setup_step,
          step_data: patch,
        },
        token
      );
    },
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
      if (userId) writeCache(userId, next);
    },
    onError: onMutationError,
  });

  const advance = useCallback(
    (stepData?: Record<string, unknown>) =>
      advanceMutation.mutateAsync(stepData),
    [advanceMutation]
  );

  const regress = useCallback(
    () => regressMutation.mutateAsync(),
    [regressMutation]
  );

  const saveStepData = useCallback(
    (patch: Record<string, unknown>) => saveStepDataMutation.mutateAsync(patch),
    [saveStepDataMutation]
  );

  const refetch = useCallback(async () => {
    const result = await query.refetch();
    return (result.data as WizardStateView | undefined) ?? null;
  }, [query]);

  const isMutating =
    advanceMutation.isPending ||
    regressMutation.isPending ||
    saveStepDataMutation.isPending;

  // Surface the most recent error from any source. Mutation errors
  // take precedence over query errors because they reflect the user's
  // last action; if the user clicks advance and gets STATE_MISMATCH,
  // they care about that error, not a stale background-refetch error.
  const lastMutationError =
    (advanceMutation.error as WizardStateError | null) ||
    (regressMutation.error as WizardStateError | null) ||
    (saveStepDataMutation.error as WizardStateError | null);
  const surfacedError = lastMutationError || error;

  return {
    state,
    setupState: state?.setup_state ?? null,
    currentStep: (state?.setup_step ?? null) as WizardStep | null,
    setupData: state?.setup_data ?? {},
    dormant: state?.dormant ?? false,
    canAdvance: state?.can_advance ?? false,
    canRegress: state?.can_regress ?? false,
    nextStep: state?.next_step ?? null,
    prevStep: state?.prev_step ?? null,

    isLoading: query.isLoading && !state,
    isFetching: query.isFetching,
    isMutating,
    isOffline,
    error: surfacedError,

    advance,
    regress,
    saveStepData,
    refetch,
  };
}

// Internal helpers exported for tests only. Not part of the public API.
export const _internal = {
  cacheKeyFor,
  readCache,
  writeCache,
  clearCache,
};
