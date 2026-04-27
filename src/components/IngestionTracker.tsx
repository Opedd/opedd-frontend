import { useCallback, useEffect, useMemo, useState } from "react";
import * as Sentry from "@sentry/react";
import { Loader2, CheckCircle2, AlertTriangle, X, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIngestionStatus } from "@/hooks/useIngestionStatus";

/**
 * Phase 1 Session 1.6 — IngestionTracker (v2 spec § Primitive 3).
 *
 * Persistent indicator across wizard steps 3-5 and dashboard. Polling
 * lives in useIngestionStatus; this component is presentational + owns
 * dismissibility state.
 *
 * Mode contract:
 *   - 'wizard'    : always expanded. No dismiss button. Done-state pill
 *                   persists throughout remaining wizard steps until the
 *                   wizard's natural navigation away (step 5 → connected).
 *                   The persistent pill is part of the v2 Aha-moment
 *                   conviction-building — DO NOT auto-unmount.
 *   - 'dashboard' : expanded by default during 'active'; auto-collapses
 *                   to a small pill on 'done'. Dismissible to a
 *                   localStorage-persisted hidden state. Re-shows
 *                   automatically when status flips back to 'active'.
 *
 * Returns null when status === 'idle' to avoid empty banner clutter.
 *
 * Mount sites:
 *   - Dashboard.tsx mounts with mode='dashboard' (Session 1.8, this commit).
 *     Replaces the legacy ImportProgressBanner per KNOWN_ISSUES #29 (closed).
 *   - Phase 3 Session 3.3 (wizard step 3-5) will mount with mode='wizard'.
 */

export interface IngestionTrackerProps {
  mode?: "wizard" | "dashboard";
  onComplete?: () => void;
  initiallyCollapsed?: boolean;
}

const DISMISS_KEY_PREFIX = "opedd:ingestion-tracker:dismissed:v1:";

function dismissKeyFor(userId: string): string {
  return DISMISS_KEY_PREFIX + userId;
}

function readDismissed(userId: string): boolean {
  try {
    const raw = localStorage.getItem(dismissKeyFor(userId));
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.dismissed === true;
  } catch (err) {
    Sentry.addBreadcrumb({
      category: "ingestion-tracker",
      level: "warning",
      message: "Corrupt localStorage dismiss state; ignoring",
      data: { error: String(err).slice(0, 120) },
    });
    return false;
  }
}

function writeDismissed(userId: string, dismissed: boolean): void {
  try {
    if (dismissed) {
      localStorage.setItem(
        dismissKeyFor(userId),
        JSON.stringify({ dismissed: true, at: new Date().toISOString() }),
      );
    } else {
      localStorage.removeItem(dismissKeyFor(userId));
    }
  } catch (err) {
    Sentry.addBreadcrumb({
      category: "ingestion-tracker",
      level: "warning",
      message: "localStorage write failed (likely quota)",
      data: { error: String(err).slice(0, 120) },
    });
  }
}

function formatInteger(n: number): string {
  return n.toLocaleString("en-US");
}

export function IngestionTracker({
  mode = "dashboard",
  onComplete,
  initiallyCollapsed,
}: IngestionTrackerProps): JSX.Element | null {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const status = useIngestionStatus({ onComplete });

  // Dismissibility — dashboard mode only. Read once on mount, then
  // managed in component state. Wizard mode ignores localStorage.
  const initialDismissed = useMemo(() => {
    if (mode !== "dashboard" || !userId) return false;
    if (initiallyCollapsed) return true;
    return readDismissed(userId);
  }, [mode, userId, initiallyCollapsed]);
  const [dismissed, setDismissed] = useState<boolean>(initialDismissed);

  // If a new active ingestion starts after dismissal, auto-undismiss.
  // Active state always shows progress regardless of prior dismiss.
  useEffect(() => {
    if (status.status === "active" && dismissed) {
      setDismissed(false);
      if (userId) writeDismissed(userId, false);
    }
  }, [status.status, dismissed, userId]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    if (mode === "dashboard" && userId) writeDismissed(userId, true);
  }, [mode, userId]);

  // Render decisions.
  if (status.status === "idle") return null;
  if (mode === "dashboard" && dismissed) return null;

  // ─── ERROR STATE ────────────────────────────────────────────────
  if (status.status === "error") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-700 font-medium">
            Couldn't finish indexing some sources
          </p>
          {status.total_articles > 0 && (
            <p className="text-xs text-red-600">
              Showing {formatInteger(status.total_articles)} articles imported so far
            </p>
          )}
        </div>
        {mode === "dashboard" && (
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="text-red-400 hover:text-red-600 flex-shrink-0"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  // ─── DONE STATE ─────────────────────────────────────────────────
  // Wizard mode: persistent expanded done state (Aha-moment pill stays
  // throughout remaining wizard steps).
  // Dashboard mode: auto-collapse to compact pill (still visible until
  // user dismisses).
  if (status.status === "done") {
    return (
      <div
        data-testid="ingestion-tracker-done"
        className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3"
      >
        <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
        <p className="text-sm text-emerald-700 font-medium flex-1">
          Archive ready · {formatInteger(status.total_articles)} article
          {status.total_articles !== 1 ? "s" : ""}
        </p>
        {mode === "dashboard" && (
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="text-emerald-500 hover:text-emerald-700 flex-shrink-0"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  // ─── ACTIVE STATE (with optional stall + offline subtitles) ─────
  const progress = status.progress;
  const showProgressBar = !!progress && progress.discovered > 0;
  const pct = showProgressBar
    ? Math.min(
        100,
        Math.round((progress!.processed / progress!.discovered) * 100),
      )
    : 0;

  return (
    <div
      data-testid="ingestion-tracker-active"
      className="bg-oxford/5 border border-oxford/15 rounded-xl px-4 py-3"
    >
      <div className="flex items-center gap-4">
        <Loader2
          size={16}
          className="text-oxford flex-shrink-0 animate-spin"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-navy-deep">
            Indexing your archive…
          </p>
          <p className="text-xs text-gray-500">
            {showProgressBar ? (
              <>
                {formatInteger(progress!.processed)} of{" "}
                {formatInteger(progress!.discovered)} articles
                {progress!.eta_minutes !== null &&
                  progress!.eta_minutes > 0 &&
                  ` · ~${progress!.eta_minutes} minute${
                    progress!.eta_minutes !== 1 ? "s" : ""
                  } remaining`}
              </>
            ) : (
              <>{formatInteger(status.total_articles)} articles indexed so far</>
            )}
          </p>
          {status.is_stalled && (
            <p className="text-xs text-gray-400 mt-0.5">
              Taking longer than expected — still working in the background.
            </p>
          )}
          {status.is_offline && (
            <p className="text-xs text-gray-400 mt-0.5">
              Connection issue — last update may be stale.
            </p>
          )}
        </div>
        {showProgressBar && (
          <div className="w-32 h-1.5 rounded-full bg-oxford/20 flex-shrink-0 overflow-hidden">
            <div
              className="h-full rounded-full bg-oxford transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {status.recent_articles.length > 0 && (
        <div
          data-testid="ingestion-tracker-recent"
          className="mt-3 pt-3 border-t border-oxford/10"
        >
          <p className="text-xs text-gray-500 mb-1.5">Recently indexed:</p>
          <ul className="space-y-1">
            {status.recent_articles.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 text-xs text-gray-700"
              >
                <FileText size={11} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">{a.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status.recent_articles.length === 0 && (
        <div className="mt-3 pt-3 border-t border-oxford/10">
          <p className="text-xs text-gray-400">
            Indexing your first articles…
          </p>
        </div>
      )}
    </div>
  );
}

// Internal helpers exported for tests only.
export const _internal = {
  dismissKeyFor,
  readDismissed,
  writeDismissed,
};
