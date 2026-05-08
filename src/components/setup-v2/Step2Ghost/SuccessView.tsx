import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { HelperExpandable } from './HelperExpandable';

// Phase 7.5 — SUCCESS view for Step2Ghost (validation passed).
//
// Mirrors Step2Beehiiv/SuccessView.tsx (Phase 6.5 ship at commit
// 2312dcb + isInteractiveTarget selector fix at commit 1967985).
// Two distinct render modes per Phase 6.5 OQ-3 routing precedent
// (inherited via Phase 7.5 OQ-7.5-A RESOLVED-via-Phase-6.5):
//
//   1. fresh — full success treatment after a fresh validate-success
//      response: 3-line confirmation + 3s countdown + click-to-advance
//      affordances. Container provides archive_job_id +
//      archive_estimated_count + webhook_registered flags from the
//      verify-ownership response (top-level fields per backend
//      platform_native_api.ts:82-86 DirectFlipResult source-verified).
//
//   2. resume_stale — minimal success state for mount-resume cases
//      where publishers.is_verified=true is detected but the response
//      doesn't carry the direct-flip-cascade flags (because the
//      verification was completed on a prior session). Skip the 3-line
//      confirmation + skip countdown + immediate auto-advance.
//
// Phase 7.5 addition vs Beehiiv: archive_estimated_count is populated
// for Ghost (Beehiiv leaves it null per Beehiiv-API constraint). 3-way
// archive line copy logic per design doc § 5: count > 0 → "Importing
// N posts"; count === 0 → "We'll import as you publish"; count null →
// generic "Importing your archive" fallback. Container reads count
// from PlatformNativeApiResult.archive_estimated_count (top-level,
// NOT nested under evidence — per OQ-7.5-F ratification implementing
// against backend deployed shape, not design-doc § 9.2 spec).
//
// Per locked UX spec (fresh mode):
//   - Centered checkmark — calm green tone (text-green-700, mirrors
//     Step5Stripe success-state precedent + Step2Beehiiv parity).
//   - Headline h2: "Connected to {publication_name}" with fallback
//     "Connected to your Ghost site" when null.
//   - 3 confirmation lines (Phase 6.5 parity; Ghost-specific copy):
//       * "✓ Verified ownership" (always)
//       * archive line — 3-way conditional per archiveLineFor helper
//       * webhook_registered=true → "✓ Real-time sync enabled"
//                              false → "○ Real-time sync deferred" + Why?
//   - Countdown indicator: "Continuing to next step in {N}..." (3 → 1)
//   - Continue button "Continue now" (secondary).
//   - Click anywhere on card area advances; keyboard Enter/Space on
//     focused card advances. Inner interactive elements (Why? buttons,
//     Continue button) NOT counted as card-area clicks — handled via
//     event-target inspection.
//
// archive_job_id NOT surfaced in v1 per OQ-7.5-E ratification (matches
// Phase 6.5 Step2Beehiiv parity). Hidden from publisher-facing UX;
// queued internally for cron pickup.
//
// LOVABLE-POLISH (Phase 10): no fade-in animation; instant view-mode
// swap. Confirmation icons are unicode glyphs (✓ / ○) for now;
// could become inline SVG icons later.

type SuccessViewProps =
  | {
      mode: 'fresh';
      publicationName: string | null;
      archiveJobId: string | null;
      archiveEstimatedCount: number | null;
      webhookRegistered: boolean;
      onAdvance: () => void;
    }
  | {
      mode: 'resume_stale';
      publicationName: string | null;
      onAdvance: () => void;
    };

const COUNTDOWN_MS = 3000;
const TICK_INTERVAL_MS = 100;

/**
 * Returns true if the click happened on an interactive descendant
 * (real <button>, <a>, <input>, <label>). Used to skip the card-
 * area click-to-advance handler when publisher clicks a Why?
 * expander or the Continue Now button — those have their own
 * semantics.
 *
 * Note: `[role="button"]` is intentionally NOT in the selector. The
 * card wrapper itself carries role="button", and `closest` walks up
 * the DOM — so including [role="button"] would match the wrapper for
 * every click inside the card and short-circuit advance entirely.
 * All actual interactive descendants are real <button> elements
 * (HelperExpandable trigger, Continue Now button) so the narrower
 * selector is sufficient. Phase 6.5 commit 1967985 selector fix
 * inherited verbatim.
 */
function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest('button, a, input, label');
}

/**
 * Compute the archive confirmation line per Ghost-specific 3-way
 * conditional on archive_estimated_count + archive_job_id. Per
 * design doc § 5 archive copy variants:
 *   - archive_job_id === null  → deferred (job INSERT silently failed)
 *   - count > 0                → "Importing N posts from your archive"
 *   - count === 0              → "Your Ghost site is connected — we'll
 *                                 import posts as you publish"
 *   - count === null/undefined → "Importing your archive" (generic
 *                                 fallback when Ghost API didn't surface
 *                                 pagination meta)
 */
function archiveLineFor(
  archiveJobId: string | null,
  count: number | null,
): { status: 'ok' | 'deferred'; label: string; whyExpand?: ReactNode } {
  if (archiveJobId === null) {
    return {
      status: 'deferred',
      label: 'Archive sync deferred',
      whyExpand: (
        <p>
          Ghost accepted your credentials, but we couldn't queue your
          archive for import. We'll retry automatically — your archive
          will arrive shortly.
        </p>
      ),
    };
  }
  if (typeof count === 'number') {
    if (count > 0) {
      return {
        status: 'ok',
        label: `Importing ${count} ${count === 1 ? 'post' : 'posts'} from your archive`,
      };
    }
    if (count === 0) {
      return {
        status: 'ok',
        label: "Your Ghost site is connected — we'll import posts as you publish",
      };
    }
  }
  // count is null/undefined — generic fallback (rare; Ghost API
  // pagination meta usually present per F1 OQ-7.0-G zero-additional-
  // call extraction at validateGhost).
  return {
    status: 'ok',
    label: 'Importing your archive',
  };
}

export function SuccessView(props: SuccessViewProps) {
  const advancedRef = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(3);

  const triggerAdvance = useCallback(() => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    props.onAdvance();
  }, [props]);

  useEffect(() => {
    // Resume-stale: immediate advance, no countdown.
    if (props.mode === 'resume_stale') {
      triggerAdvance();
      return;
    }

    // Fresh: 3s countdown.
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      const remaining = Math.max(0, Math.ceil((COUNTDOWN_MS - elapsedMs) / 1000));
      setSecondsLeft(remaining);
      if (elapsedMs >= COUNTDOWN_MS) {
        clearInterval(interval);
        triggerAdvance();
      }
    }, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [props.mode, triggerAdvance]);

  const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(e.target)) return;
    triggerAdvance();
  };

  const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerAdvance();
    }
  };

  const headline =
    props.publicationName && props.publicationName.trim().length > 0
      ? `Connected to ${props.publicationName}`
      : 'Connected to your Ghost site';

  // ─── Resume-stale branch — minimal render; auto-advance fires in
  //     useEffect above ───────────────────────────────────────────
  if (props.mode === 'resume_stale') {
    return (
      <div className="min-h-screen bg-alice-gray px-6 py-12">
        <div className="max-w-xl mx-auto text-center">
          <div
            className="text-6xl text-green-700 leading-none mb-4"
            aria-hidden="true"
          >
            ✓
          </div>
          <h2 className="text-2xl font-semibold text-navy-deep mb-2">
            {headline}
          </h2>
          <p className="text-sm text-gray-500" role="status" aria-live="polite">
            Continuing…
          </p>
        </div>
      </div>
    );
  }

  // ─── Fresh branch ───────────────────────────────────────────────
  const archiveLine = archiveLineFor(props.archiveJobId, props.archiveEstimatedCount);

  return (
    <div className="min-h-screen bg-alice-gray px-6 py-12">
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        aria-label="Continue to the next step"
        className="max-w-xl mx-auto rounded-2xl bg-white border border-gray-200 p-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy-deep/20 hover:border-gray-300 transition-colors"
      >
        <div className="text-center">
          <div
            className="text-6xl text-green-700 leading-none mb-4"
            aria-hidden="true"
          >
            ✓
          </div>
          <h2 className="text-2xl font-semibold text-navy-deep mb-6">
            {headline}
          </h2>
        </div>

        <ul className="space-y-3 mb-8">
          <ConfirmationLine status="ok" label="Verified ownership" />

          <ConfirmationLine
            status={archiveLine.status}
            label={archiveLine.label}
            whyExpand={archiveLine.whyExpand}
          />

          {props.webhookRegistered ? (
            <ConfirmationLine status="ok" label="Real-time sync enabled" />
          ) : (
            <ConfirmationLine
              status="deferred"
              label="Real-time sync deferred"
              whyExpand={
                <p>
                  Ghost didn't accept the webhook registration. Your archive
                  will still import, and we'll fetch new posts every few hours
                  via backfill. You can retry real-time sync later from
                  Settings.
                </p>
              }
            />
          )}
        </ul>

        <div className="text-center space-y-3">
          <p className="text-sm text-gray-500" role="status" aria-live="polite">
            Continuing to next step in {secondsLeft}…
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => triggerAdvance()}
            className="px-6"
          >
            Continue now
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmationLineProps {
  status: 'ok' | 'deferred';
  label: string;
  whyExpand?: ReactNode;
}

function ConfirmationLine({ status, label, whyExpand }: ConfirmationLineProps) {
  const isOk = status === 'ok';
  return (
    <li>
      <div className="flex items-start gap-3">
        <span
          className={
            isOk
              ? 'text-green-700 font-semibold leading-6'
              : 'text-gray-400 font-semibold leading-6'
          }
          aria-hidden="true"
        >
          {isOk ? '✓' : '○'}
        </span>
        <span className={isOk ? 'text-navy-deep' : 'text-gray-500'}>{label}</span>
      </div>
      {whyExpand && (
        <div className="ml-7 mt-1">
          <HelperExpandable label="Why?" id={`why-${label.replace(/\s+/g, '-').toLowerCase()}`}>
            {whyExpand}
          </HelperExpandable>
        </div>
      )}
    </li>
  );
}
