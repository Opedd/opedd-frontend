import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { HelperExpandable } from './HelperExpandable';

// Phase 8.6 — SUCCESS view for Step2Api (key issued).
//
// Mirrors Step2Ghost/SuccessView.tsx (Phase 7.5 ship) — two render
// modes (fresh + resume_stale) + countdown auto-advance + click/
// keyboard advance affordance. Step2Api-specific UX:
//   - Plaintext key revealed ONCE in a copy-to-clipboard widget
//   - Persistent "save this key now — we can't show it again" warning
//   - Curl example with the live key value (one-time visible)
//   - resume_stale renders for publishers who created a key in a prior
//     session (setup_data.api_key_id present); shows key prefix +
//     "your key is already created" but NEVER plaintext (we can't
//     re-fetch it). Skip the countdown; immediate advance.
//
// LOVABLE-POLISH (Phase 10): no fade-in animation; instant view-mode
// swap. Copy-to-clipboard uses navigator.clipboard.writeText with
// fallback. Real polish for the curl-block syntax highlighting +
// micro-celebration animation deferred.

type SuccessViewProps =
  | {
      mode: 'fresh';
      plaintextKey: string;
      keyPrefix: string;
      environment: 'live' | 'test';
      name?: string;
      onAdvance: () => void;
    }
  | {
      mode: 'resume_stale';
      keyPrefix: string;
      environment: 'live' | 'test';
      onAdvance: () => void;
    };

const COUNTDOWN_MS = 6000;
const TICK_INTERVAL_MS = 100;

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest('button, a, input, label, code');
}

export function SuccessView(props: SuccessViewProps) {
  const advancedRef = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(6);
  const [copied, setCopied] = useState(false);

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

    // Fresh: 6s countdown (longer than Ghost's 3s — the publisher
    // needs more time to copy their plaintext key before auto-advance).
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

  const handleCopyKey = useCallback(async (keyValue: string) => {
    try {
      await navigator.clipboard.writeText(keyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g., insecure context); user can
      // select the key manually — no fallback needed.
    }
  }, []);

  // ─── Resume-stale branch ─────────────────────────────────────────
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
            Your API key is ready
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Key{' '}
            <code className="font-mono text-navy-deep">{props.keyPrefix}…</code>{' '}
            ({props.environment})
          </p>
          <p className="text-sm text-gray-500" role="status" aria-live="polite">
            Continuing…
          </p>
        </div>
      </div>
    );
  }

  // ─── Fresh branch ───────────────────────────────────────────────
  const curlExample = `curl -X POST https://api.opedd.com/publishers-content \\
  -H "Authorization: Bearer ${props.plaintextKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "articles": [{
      "title": "Hello from my CMS",
      "url": "https://example.com/posts/hello",
      "published_at": "${new Date().toISOString()}",
      "html_body": "<p>First article via the Opedd API.</p>"
    }]
  }'`;

  return (
    <div className="min-h-screen bg-alice-gray px-6 py-12">
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        aria-label="Continue to the next step"
        className="max-w-2xl mx-auto rounded-2xl bg-white border border-gray-200 p-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy-deep/20 hover:border-gray-300 transition-colors"
      >
        <div className="text-center mb-6">
          <div
            className="text-6xl text-green-700 leading-none mb-4"
            aria-hidden="true"
          >
            ✓
          </div>
          <h2 className="text-2xl font-semibold text-navy-deep mb-2">
            Your API key is ready
          </h2>
          <p className="text-sm text-gray-600">
            {props.environment === 'test' ? 'Sandbox' : 'Live'} key{' '}
            {props.name ? `"${props.name}"` : ''}
          </p>
        </div>

        {/* Plaintext key reveal — load-bearing security UX */}
        <div className="mb-6">
          <div
            role="alert"
            className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <strong className="font-semibold">Save this key now.</strong> We
            can't show it again — if you lose it, you'll have to revoke and
            re-issue.
          </div>

          <div className="rounded-lg border border-gray-300 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <label
                htmlFor="api-key-reveal"
                className="text-xs font-medium text-gray-600 uppercase tracking-wide"
              >
                Your API key
              </label>
              <button
                type="button"
                onClick={() => handleCopyKey(props.plaintextKey)}
                className="text-xs font-medium text-navy-deep underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-navy-deep/20 rounded-sm px-2 py-0.5"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <code
              id="api-key-reveal"
              className="block font-mono text-sm text-navy-deep break-all select-all"
            >
              {props.plaintextKey}
            </code>
          </div>
        </div>

        {/* Curl example with the actual key */}
        <div className="mb-6">
          <HelperExpandable
            id="api-curl-example"
            label="Try it now (curl example)"
          >
            <p className="mb-2 text-xs text-gray-600">
              Paste this into a terminal to push your first article. The
              endpoint accepts up to 100 articles per call.
            </p>
            <pre className="overflow-x-auto rounded-md bg-navy-deep text-white text-xs p-3 leading-relaxed">
              <code>{curlExample}</code>
            </pre>
          </HelperExpandable>
        </div>

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
