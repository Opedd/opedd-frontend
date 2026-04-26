import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

/**
 * Phase 1 Session 1.6 — IngestionStatus hook for the IngestionTracker
 * primitive (v2 spec § Primitive 3).
 *
 * Polls publisher-profile + licenses sample every 3 seconds while
 * ingestion is active; stops polling when status flips to done / error /
 * idle. Hook is unmounted in this session; first consumer is Phase 3
 * Session 3.3 (wizard step 3-5) and Phase 1/3 Session 1.8 / 3.6 (dashboard).
 *
 * Polling cost note (pre-mount): one IngestionTracker mount = ~40
 * req/min while active (3s cadence × 2 parallel fetches: publisher-
 * profile + licenses sample). 50 simultaneous active wizards =
 * ~2,000 req/min total. Not a blocker for shipping unmounted in
 * Session 1.6, but pre-mount review in Phase 3 Session 3.3 should
 * verify publisher-profile latency under that load. Future
 * optimizations if needed: response caching headers, exponential
 * backoff for slow archives, or per-publisher session-level
 * adaptive cadence (e.g. 3s for first 30s, 10s thereafter).
 *
 * State machine (4 cases, evaluated in order, first match wins):
 *   1. any source archive_status='failed' AND no other active → 'error'
 *   2. any source archive_status ∈ {'queued','running'} → 'active'
 *   3. pending_sources.length === 0 AND article_count > 0 → 'done'
 *   4. else → 'idle'
 *
 * No count-delta heuristic. Earlier draft considered one — "count grew
 * within last 30s → active" — to cover ingestion paths that complete
 * faster than the 3s poll cadence (Substack RSS imports ~25 articles in
 * one call). Dropped because the heuristic incorrectly fires on the
 * active→done transition (count grows between the last 'active' poll
 * and the first 'done' poll), making 'done' unreachable until growth
 * stalls. For fast-completing imports (RSS, small archives), the wizard
 * simply skips the visible 'active' phase and renders 'done' immediately
 * — accurate, no UX regression. Long imports (Beehiiv / Ghost / WordPress
 * full archives) reliably expose archive_status='running' and trigger
 * case 2.
 *
 * The status flows from observable data only; useRef session-history
 * tracking is used SOLELY to gate the onComplete callback (fires only
 * on in-session active → done transitions, not on fresh-load done).
 * This means a publisher who refreshes the dashboard after ingestion
 * already completed will see status='done' immediately without
 * onComplete firing — the consumer's data is already fresh, and the
 * tracker pill still renders correctly.
 */

const STALE_THRESHOLD_MS = 60_000; // 60s with no count change → "taking longer"

export type IngestionState = "idle" | "active" | "done" | "error";

export interface PendingSource {
  id: string;
  url: string;
  source_type: string | null;
  archive_status?: string | null;
  archive_count?: number | null;
  verification_status?: string | null;
}

export interface RecentArticle {
  id: string;
  title: string;
  source_url: string | null;
  created_at: string;
}

export interface IngestionStatus {
  status: IngestionState;
  total_articles: number;
  pending_sources: PendingSource[];
  recent_articles: RecentArticle[];
  // Optional progress block, populated only when an underlying source
  // has total/processed counts (sitemap-based imports). For Substack RSS
  // / Beehiiv API ingestion, only total_articles is shown.
  progress?: {
    discovered: number;
    processed: number;
    eta_minutes: number | null;
  };
  is_offline: boolean;
  is_stalled: boolean;
  error: Error | null;
}

interface ProfileResponse {
  success?: boolean;
  data?: {
    id: string;
    article_count?: number;
    pending_sources?: PendingSource[];
  };
}

async function fetchProfile(token: string | null): Promise<ProfileResponse["data"] | null> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: EXT_ANON_KEY,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
    method: "GET",
    headers,
  });
  if (!res.ok) {
    throw new Error(`publisher-profile returned ${res.status}`);
  }
  const body = (await res.json()) as ProfileResponse;
  return body.data ?? null;
}

async function fetchRecentArticles(publisherId: string): Promise<RecentArticle[]> {
  // Direct PostgREST — matches Dashboard.tsx pattern; avoids edge-function
  // round-trip for a simple list query. Auth via the supabase client's
  // own session token (same client used elsewhere in the app).
  const { data, error } = await (supabase.from as any)("licenses")
    .select("id, title, source_url, created_at")
    .eq("publisher_id", publisherId)
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) {
    Sentry.addBreadcrumb({
      category: "ingestion-status",
      level: "warning",
      message: "Failed to fetch recent articles",
      data: { error: String(error.message ?? error).slice(0, 120) },
    });
    return [];
  }
  return (data as RecentArticle[]) ?? [];
}

function computeStatus(
  pendingSources: PendingSource[],
  articleCount: number,
): IngestionState {
  // 1. Error: any source explicitly failed AND no other source is active.
  const hasFailed = pendingSources.some((s) => s.archive_status === "failed");
  const hasActive = pendingSources.some(
    (s) => s.archive_status === "queued" || s.archive_status === "running",
  );
  if (hasFailed && !hasActive) return "error";

  // 2. Active: any source queued/running.
  if (hasActive) return "active";

  // 3. Done: nothing pending AND we have articles. Independent of
  //    session history — refreshing after completion shows 'done'
  //    immediately. onComplete gating is handled separately via useRef.
  if (pendingSources.length === 0 && articleCount > 0) return "done";

  // 4. Idle: no pending, no articles. Empty publisher.
  return "idle";
}

interface PollSnapshot {
  status: IngestionState;
  article_count: number;
  pending_sources: PendingSource[];
  recent_articles: RecentArticle[];
  progress?: IngestionStatus["progress"];
}

interface UseIngestionStatusOptions {
  onComplete?: () => void;
}

export function useIngestionStatus(
  options: UseIngestionStatusOptions = {},
): IngestionStatus {
  const { user, getAccessToken } = useAuth();
  const userId = user?.id ?? null;
  const onComplete = options.onComplete;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Tracks whether we've observed an 'active' status in this session;
  // gates onComplete to fire only on real in-session transitions, not
  // on fresh-load 'done' renders.
  const observedActiveRef = useRef(false);

  // Tracks the last article_count change for the stall detector
  // (60s with no count change while still 'active' → "taking longer").
  const lastChangeRef = useRef<{ count: number; at: number } | null>(null);

  const queryKey = useMemo(
    () => (userId ? (["ingestion-status", userId] as const) : (["ingestion-status"] as const)),
    [userId],
  );

  const queryFn = useCallback(async (): Promise<PollSnapshot> => {
    const token = await getAccessToken();
    const profile = await fetchProfile(token);
    if (!profile) {
      return {
        status: "idle",
        article_count: 0,
        pending_sources: [],
        recent_articles: [],
      };
    }

    const articleCount = profile.article_count ?? 0;
    const pendingSources = profile.pending_sources ?? [];
    const recent = await fetchRecentArticles(profile.id);

    const status = computeStatus(pendingSources, articleCount);

    // Track count changes for stall detection.
    if (
      lastChangeRef.current === null ||
      articleCount !== lastChangeRef.current.count
    ) {
      lastChangeRef.current = { count: articleCount, at: Date.now() };
    }

    // Synthesize progress block when underlying sources expose totals.
    let progress: IngestionStatus["progress"] | undefined;
    const totals = pendingSources.reduce(
      (acc, s) => {
        if (typeof s.archive_count === "number") {
          acc.processed += s.archive_count;
        }
        return acc;
      },
      { discovered: 0, processed: 0 },
    );
    if (totals.processed > 0 || pendingSources.length > 0) {
      const remaining = Math.max(0, totals.discovered - totals.processed);
      const etaMinutes = remaining > 0 ? Math.ceil(remaining / 250) : null;
      progress = {
        discovered: totals.discovered || articleCount,
        processed: totals.processed || articleCount,
        eta_minutes: etaMinutes,
      };
    }

    return {
      status,
      article_count: articleCount,
      pending_sources: pendingSources,
      recent_articles: recent,
      progress,
    };
  }, [getAccessToken]);

  const query = useQuery<PollSnapshot, Error>({
    queryKey,
    enabled: !!userId,
    queryFn,
    staleTime: 0,
    refetchInterval: (q) => (q.state.data?.status === "active" ? 3000 : false),
    refetchOnWindowFocus: true,
    retry: (failureCount) => failureCount < 1,
  });

  // Fire onComplete on in-session active → done transition. Gated by
  // observedActiveRef so a fresh-load done doesn't fire it.
  useEffect(() => {
    const status = query.data?.status;
    if (status === "active") {
      observedActiveRef.current = true;
    }
    if (status === "done" && observedActiveRef.current) {
      observedActiveRef.current = false; // single-fire per session
      onCompleteRef.current?.();
    }
  }, [query.data?.status]);

  const data = query.data;
  const status: IngestionState = data?.status ?? "idle";
  const isOffline = !!query.error && !!data;

  // Stall: status still active but article_count hasn't changed for
  // STALE_THRESHOLD_MS. Soft signal — surface to user, no auto-error.
  const isStalled =
    status === "active" &&
    lastChangeRef.current !== null &&
    Date.now() - lastChangeRef.current.at > STALE_THRESHOLD_MS;

  return {
    status,
    total_articles: data?.article_count ?? 0,
    pending_sources: data?.pending_sources ?? [],
    recent_articles: data?.recent_articles ?? [],
    progress: data?.progress,
    is_offline: isOffline,
    is_stalled: isStalled,
    error: (query.error as Error | null) ?? null,
  };
}

// Internal helpers exported for tests only.
export const _internal = {
  computeStatus,
  STALE_THRESHOLD_MS,
};
