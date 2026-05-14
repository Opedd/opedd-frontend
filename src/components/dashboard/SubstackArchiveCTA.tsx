import { useEffect, useState } from "react";
import { X, Upload } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Phase 11 M1.c Correction 3 — Substack archive-upload CTA banner.
 *
 * Renders for verified Substack publishers post-onboarding until they
 * upload their ZIP archive. Persistent + dismissable per session;
 * reappears after a session-storage reset (so genuinely-missing-archive
 * publishers don't lose the prompt permanently).
 *
 * Substack RSS at onboarding is wow-factor-only (per Correction 3) —
 * full-archive licensing for AI training requires the publisher to
 * upload their Substack ZIP. This banner is the canonical surface
 * pointing to that flow.
 *
 * Link target: `/settings/archive` placeholder for v1; M3+ scope per
 * audit + active-deferrals. If the route doesn't exist yet the link
 * 404s gracefully — content-only banner.
 */

const DISMISS_KEY = "opedd:substack-archive-cta:dismissed";

interface SubstackArchiveCTAProps {
  /** Publisher's content_sources platform / setup_data platform. Component
   * only renders when this is "substack". */
  platform: string | null | undefined;
  /** Whether the publisher has already uploaded an archive (archive_uploaded
   * boolean on publisher row OR derivable signal). When true, banner hides. */
  archiveUploaded?: boolean;
}

export function SubstackArchiveCTA({ platform, archiveUploaded }: SubstackArchiveCTAProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (platform !== "substack") return null;
  if (archiveUploaded) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "true");
    } catch {
      /* swallow */
    }
    setDismissed(true);
  };

  return (
    <div className="bg-white rounded-xl border-2 border-oxford/40 p-5 shadow-card">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Upload size={18} className="text-oxford mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-navy-deep">
              Complete your setup: Upload your Substack archive
            </p>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Enable full-archive licensing for AI training. Export your archive from Substack and upload it here — we'll handle the rest.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/settings/archive"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-navy-deep text-alice-gray text-sm font-medium hover:bg-navy-deep/90"
          >
            Upload archive →
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
