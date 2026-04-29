import { useEffect, useMemo, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Phase 4 Session 4.1.4 — TokenDisplay component.
 *
 * Standalone presentational component for an issued verification token
 * (visible_text_token OR dns_txt_record). Renders the token value in a
 * monospace block, a copy-to-clipboard button with success feedback, a
 * coarse-grained "Expires in Xh Ym" countdown, hint text, and a regen
 * button. Per design proposal §A.6 + § H.3 (founder-approved).
 *
 * Countdown rationale (60s update cadence, not 1s):
 *   24h TTL is generous; the publisher will never see a "last 5 seconds"
 *   countdown in practice. Updating every second forces a React re-render
 *   per second across the wizard. Updating every 60s is sufficient
 *   resolution for a 24h timer and avoids the re-render cost.
 *
 * Regen rate-limit:
 *   Backend enforces 3 issuances per 24h per publisher (visible_text_token
 *   spec §A.2). When the cap is hit, issue_token returns 429
 *   TOO_MANY_ATTEMPTS. The parent component passes `regenCooldownUntil`
 *   when it receives that response; this component renders countdown text
 *   ("Regen available in Xh Ym") on the disabled regen button instead of
 *   just disabling silently. UX-essential — the publisher must understand
 *   why the button doesn't work.
 *
 * Platform-agnostic: works for both visible_text_token (paste-on-About-page
 * UX) and dns_txt_record (TXT-record UX). Parent component sets the
 * `pasteTargetLabel` and `hintText` props per method.
 *
 * Lovable polish lands Phase 10 — this is functional Plaid/Linear-toned
 * v1 markup matching SetupV2 sibling components.
 */

interface TokenDisplayProps {
  /** The full token string, e.g. "opedd-verify-A8F9C2BX". */
  token: string;

  /** ISO timestamp when the token expires (24h from issue). */
  expiresAt: string;

  /**
   * ISO timestamp when regen becomes available again. Null if regen is
   * available now. Set by parent when backend returns 429 on issue_token.
   */
  regenCooldownUntil?: string | null;

  /**
   * Click handler for the "Generate new token" button. Disabled when
   * regenCooldownUntil is set + in the future. Parent owns the
   * regen network call + handling the 429 response.
   */
  onRegen?: () => void;

  /**
   * Optional callback fired when the copy-to-clipboard succeeds. Useful
   * for analytics or imperative parent state (e.g., enabling the
   * "Verify now" button only after copy).
   */
  onCopy?: () => void;

  /**
   * Hint text shown above the token. Parent sets this per method.
   * Examples:
   *   visible_text_token → "Paste this anywhere on your /about page."
   *   dns_txt_record     → "Add this as a TXT record at the name shown below."
   */
  hintText: string;

  /**
   * Optional secondary line shown below the token block. Used for
   * dns_txt_record to show the record name (e.g., "_opedd-verify.example.com").
   * Pass null/undefined for visible_text_token (no secondary line needed).
   */
  pasteTargetLabel?: string | null;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "expired";
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 1) return "less than 1 min";
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function TokenDisplay({
  token,
  expiresAt,
  regenCooldownUntil,
  onRegen,
  onCopy,
  hintText,
  pasteTargetLabel,
}: TokenDisplayProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  // `now` updates every 60s; the two countdowns (expires, regen-cooldown)
  // both derive from this single state to share the same render trigger.
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const expiresMs = useMemo(() => {
    const t = new Date(expiresAt).getTime();
    return Number.isFinite(t) ? t - now : 0;
  }, [expiresAt, now]);

  const regenLockMs = useMemo(() => {
    if (!regenCooldownUntil) return 0;
    const t = new Date(regenCooldownUntil).getTime();
    return Number.isFinite(t) ? t - now : 0;
  }, [regenCooldownUntil, now]);

  const regenDisabled = regenLockMs > 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopyState("copied");
      onCopy?.();
      // Reset back to idle after 2s so the publisher can copy again if
      // their first paste went somewhere unexpected.
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 3000);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <p className="text-sm text-gray-700">{hintText}</p>

      <div className="flex items-stretch gap-2">
        <code
          data-testid="token-display-value"
          className="flex-1 rounded-md bg-gray-50 border border-gray-200 px-4 py-3 font-mono text-base tracking-wide text-gray-900 break-all select-all"
        >
          {token}
        </code>
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={handleCopy}
          aria-label="Copy token to clipboard"
          data-testid="token-display-copy"
          className="shrink-0"
        >
          {copyState === "copied" ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied
            </>
          ) : copyState === "error" ? (
            <>Copy failed</>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </>
          )}
        </Button>
      </div>

      {pasteTargetLabel ? (
        <p
          data-testid="token-display-paste-target"
          className="text-xs text-gray-600"
        >
          <span className="font-medium">Where:</span>{" "}
          <code className="font-mono text-gray-800">{pasteTargetLabel}</code>
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 pt-1 text-xs text-gray-500">
        <span data-testid="token-display-expires">
          Expires in {formatRemaining(expiresMs)}
        </span>
        {onRegen ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRegen}
            disabled={regenDisabled}
            data-testid="token-display-regen"
            className="h-auto py-1 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            {regenDisabled
              ? `Regen available in ${formatRemaining(regenLockMs)}`
              : "Generate new token"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
