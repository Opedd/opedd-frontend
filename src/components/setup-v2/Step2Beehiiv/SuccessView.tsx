import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { HelperExpandable } from './HelperExpandable';

// Phase 6.5 — SUCCESS view for Step2Beehiiv (validation passed).
//
// Two distinct render modes per CHECKPOINT 1 OQ-3 routing:
//
//   1. fresh — full success treatment after a fresh validate-success
//      response: 3-line confirmation + 3s countdown + click-to-advance
//      affordances. Container provides archive_job_id +
//      webhook_registered flags from the verify-ownership response.
//
//   2. resume_stale — minimal success state for mount-resume cases
//      where publishers.is_verified=true is detected but the response
//      doesn't carry the direct-flip-cascade flags (because the
//      verification was completed on a prior session). Skip the 3-line
//      confirmation + skip countdown + immediate auto-advance.
//
// Per locked UX spec (fresh mode):
//   - Centered checkmark — calm green tone (text-green-700, mirrors
//     Step5Stripe success-state precedent).
//   - Headline h2: "Connected to {publication_name}" with fallback
//     "Connected to your Beehiiv newsletter" when null.
//   - 3 confirmation lines:
//       * "✓ Verified ownership" (always)
//       * archive_job_id != null  → "✓ Importing your archive"
//                       == null  → "○ Archive sync deferred" + Why?
//       * webhook_registered=true → "✓ Real-time sync enabled"
//                              false → "○ Real-time sync deferred" + Why?
//   - Countdown indicator: "Continuing to next step in {N}..." (3 → 1)
//   - Continue button "Continue now" (secondary).
//   - Click anywhere on card area advances; keyboard Enter/Space on
//     focused card advances. Inner interactive elements (Why? buttons,
//     Continue button) NOT counted as card-area clicks — handled via
//     event-target inspection.
//
// LOVABLE-POLISH (Phase 10): no fade-in animation; instant view-mode
// swap. Confirmation icons are unicode glyphs (✓ / ○) for now;
// could become inline SVG icons later.

type SuccessViewProps =
  | {
      mode: 'fresh';
      publicationName: string | null;
      archiveJobId: string | null;
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
 * (button, link, input, label, role="button"). Used to skip the
 * card-area click-to-advance handler when publisher clicks a Why?
 * expander or the Continue Now button — those have their own
 * semantics.
 */
function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest('button, a, input, label, [role="button"]');
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
      : 'Connected to your Beehiiv newsletter';

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

          {props.archiveJobId !== null ? (
            <ConfirmationLine status="ok" label="Importing your archive" />
          ) : (
            <ConfirmationLine
              status="deferred"
              label="Archive sync deferred"
              whyExpand={
                <p>
                  Beehiiv accepted your credentials, but we couldn't queue your
                  archive for import. We'll retry automatically — your archive
                  will arrive shortly.
                </p>
              }
            />
          )}

          {props.webhookRegistered ? (
            <ConfirmationLine status="ok" label="Real-time sync enabled" />
          ) : (
            <ConfirmationLine
              status="deferred"
              label="Real-time sync deferred"
              whyExpand={
                <p>
                  Beehiiv didn't accept the webhook registration. Your archive
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
  whyExpand?: React.ReactNode;
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
