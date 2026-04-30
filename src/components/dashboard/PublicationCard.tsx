import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Clock, AlertTriangle, ExternalLink, Upload, Eye, ArrowRight, LifeBuoy } from "lucide-react";
import type { PublicationCardProps, PublicationCTA } from "@/types/dashboard";

/**
 * Phase 4.7.1 — Vercel-style publication card.
 *
 * One card per publisher account (per OQ.5 single-publication-per-account v1).
 * Field sources resolved per OQ.5 spec; composition done in `usePublication` hook.
 *
 * Logo fallback chain: branding_data.logo_url → Google favicon (s2/favicons API).
 * Verification badge: direct from publishers.verification_status (OQ.5).
 * Primary CTA: derived in hook per OQ-C (verified+setup_complete=false → continue_setup).
 */

const CTA_LABEL: Record<PublicationCTA, string> = {
  import_content: "Import content",
  view_licenses: "View licenses",
  continue_setup: "Continue setup",
  get_started: "Get started",
  contact_support: "Contact support",
};

const CTA_ICON: Record<PublicationCTA, typeof Upload> = {
  import_content: Upload,
  view_licenses: Eye,
  continue_setup: ArrowRight,
  get_started: ArrowRight,
  contact_support: LifeBuoy,
};

function getRelativeTime(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function googleFaviconFor(url: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  } catch {
    return null;
  }
}

export function PublicationCard({
  publication,
  onImportContent,
  onViewLicenses,
  onContinueSetup,
  onContactSupport,
}: PublicationCardProps) {
  const handleClick = () => {
    switch (publication.primaryCTA) {
      case "import_content":
        onImportContent?.();
        return;
      case "view_licenses":
        onViewLicenses?.();
        return;
      case "continue_setup":
      case "get_started":
        onContinueSetup?.();
        return;
      case "contact_support":
        onContactSupport?.();
        return;
    }
  };

  const ctaIcon = CTA_ICON[publication.primaryCTA];
  const CTAIcon = ctaIcon;
  const ctaLabel = CTA_LABEL[publication.primaryCTA];

  const logoSrc = publication.logoUrl ?? googleFaviconFor(publication.publicationUrl);
  const lastSyncRelative = getRelativeTime(publication.contentSources?.last_sync_at ?? null);

  const verificationBadge = (() => {
    if (publication.verificationStatus === "verified") {
      return (
        <Badge variant="outline" className="text-[10px] px-2 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 flex-shrink-0">
          <ShieldCheck size={10} />
          Verified
        </Badge>
      );
    }
    if (publication.verificationStatus === "suspended") {
      return (
        <Badge variant="outline" className="text-[10px] px-2 py-0 bg-red-50 text-red-700 border-red-200 gap-1 flex-shrink-0">
          <AlertTriangle size={10} />
          Suspended
        </Badge>
      );
    }
    if (publication.verificationStatus === "failed") {
      return (
        <Badge variant="outline" className="text-[10px] px-2 py-0 bg-amber-50 text-amber-700 border-amber-200 gap-1 flex-shrink-0">
          <AlertTriangle size={10} />
          Verification failed
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] px-2 py-0 bg-oxford/5 text-oxford border-oxford/20 gap-1 flex-shrink-0">
        <Clock size={10} />
        Pending
      </Badge>
    );
  })();

  // OQ-C: setup_state contradiction surface — verified verification but incomplete wizard.
  const showSetupContradictionHint =
    publication.verificationStatus === "verified" && !publication.setupComplete;

  return (
    <div className="bg-white rounded-xl border border-blue-50 p-5 hover:shadow-popover transition-all">
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={publication.name}
                className="w-12 h-12 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span className="text-lg font-semibold text-navy-deep">
                {publication.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-navy-deep text-sm truncate">{publication.name}</h3>
            {verificationBadge}
          </div>

          {publication.publicationUrl && (
            <p className="text-xs text-navy-deep/50 truncate">{publication.publicationUrl}</p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-navy-deep/40">
            <span className="font-medium">
              {publication.licenseCount} article{publication.licenseCount === 1 ? "" : "s"}
            </span>
            {lastSyncRelative ? (
              <span>Synced {lastSyncRelative}</span>
            ) : (
              <span>Never synced</span>
            )}
          </div>
        </div>
      </div>

      {showSetupContradictionHint && (
        <div
          role="status"
          className="mt-3 bg-oxford/5 border border-oxford/15 rounded-lg p-3 flex items-start gap-2"
        >
          <Clock size={14} className="text-oxford mt-0.5 flex-shrink-0" />
          <div className="text-xs text-navy-deep/70">
            Verification done — finish the rest of setup to start licensing.
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-blue-50">
        <Button
          type="button"
          size="sm"
          onClick={handleClick}
          className="h-8 text-xs gap-1.5 bg-oxford hover:bg-oxford-dark text-white rounded-lg"
        >
          <CTAIcon size={12} />
          {ctaLabel}
        </Button>

        {/* Phase 4.7.3 PFQ-6 (ii): secondary Import content link for verified+licenseCount>0
            publishers, so established publishers can re-import without losing the primary
            "View licenses" CTA. Skipped when primary IS already "Import content" (avoid dup). */}
        {publication.verificationStatus === "verified" && publication.primaryCTA === "view_licenses" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onImportContent?.()}
            className="h-8 text-xs gap-1.5 text-gray-500 hover:text-navy-deep hover:bg-transparent"
          >
            <Upload size={12} />
            Import content
          </Button>
        )}

        {publication.publicationUrl && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 text-xs gap-1.5 text-gray-400 hover:text-navy-deep hover:bg-transparent"
          >
            <a
              href={
                publication.publicationUrl.startsWith("http")
                  ? publication.publicationUrl
                  : `https://${publication.publicationUrl}`
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={12} />
              Visit
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
