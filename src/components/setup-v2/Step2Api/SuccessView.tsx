import { useCallback, useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { HelperExpandable } from './HelperExpandable';

// Phase 8.6 — SUCCESS view for Step2Api (key issued).
//
// Mirrors Step2Ghost/SuccessView.tsx (Phase 7.5 ship) shape — two
// render modes (fresh + resume_stale). Step2Api-specific UX diverges
// from sibling Step2Ghost/Step2Beehiiv on the fresh-branch advance
// mechanism (Phase 8.6.0 amendment per founder live-flow gate
// surface 2026-05-12):
//
//   - Plaintext key is a one-time-shown 35-char secret. If the
//     publisher misses the copy window, they MUST revoke + reissue.
//   - Canonical pattern (Stripe / GitHub / AWS): persistent reveal +
//     acknowledgment checkbox + user-driven Continue. NO auto-advance.
//   - Acknowledgment: "I've saved this key in a secure location"
//     checkbox. Continue button disabled until checked.
//   - Card-area click-to-advance + Enter/Space-to-advance REMOVED
//     for fresh branch (avoid accidental advance before publisher
//     copies the key). resume_stale retains immediate-advance (no
//     plaintext at stake).
//
// Pre-amendment shape (39f98b0): 6s countdown + click-card-to-
// advance. Founder live-flow gate revealed: (a) field-name mismatch
// caused plaintext to render empty; (b) 6s countdown was too
// aggressive to copy a 35-char key even if rendering correctly.
// Both axes fixed in this amendment.
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
      name?: string;
      onAdvance: () => void;
    }
  | {
      mode: 'resume_stale';
      keyPrefix: string;
      onAdvance: () => void;
    };

export function SuccessView(props: SuccessViewProps) {
  const advancedRef = useRef(false);
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const triggerAdvance = useCallback(() => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    props.onAdvance();
  }, [props]);

  // Resume-stale: immediate advance, no countdown (no plaintext at
  // stake; publisher has nothing to copy). Fresh branch: NO auto-
  // advance per Phase 8.6.0 amendment — view persists indefinitely
  // until publisher checks the acknowledgment box + clicks Continue.
  useEffect(() => {
    if (props.mode === 'resume_stale') {
      triggerAdvance();
    }
  }, [props.mode, triggerAdvance]);

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
            <code className="font-mono text-navy-deep">{props.keyPrefix}…</code>
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
      <div className="max-w-2xl mx-auto rounded-2xl bg-white border border-gray-200 p-8">
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
            {props.name ? `"${props.name}"` : 'Your new key'}
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

        {/* Acknowledgment gate — Continue button disabled until checkbox checked.
            Canonical Stripe/GitHub/AWS pattern for one-time-shown secret reveal. */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-navy-deep focus:ring-navy-deep/30"
              aria-describedby="api-ack-helper"
            />
            <span className="text-sm text-navy-deep">
              I've saved this key in a secure location
            </span>
          </label>
          <p id="api-ack-helper" className="text-xs text-gray-500 ml-7">
            Once you continue, this key won't be shown again. Make sure you've
            copied it to your password manager, a `.env` file, or wherever your
            system reads credentials.
          </p>

          <div className="text-center pt-2">
            <Button
              type="button"
              onClick={() => triggerAdvance()}
              disabled={!acknowledged}
              className="px-8"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
