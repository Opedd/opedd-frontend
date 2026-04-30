import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { usePublication } from "@/hooks/usePublication";
import type { DetectionResult } from "@/lib/api";
import { PublicationCard } from "@/components/dashboard/PublicationCard";
import { SubstackImportCard } from "@/components/dashboard/SubstackImportCard";
import { WordPressPluginCard } from "@/components/dashboard/WordPressPluginCard";
import { PlatformConnectModal } from "@/components/dashboard/PlatformConnectModal";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Phase 4.7.1 — SourcesView rewritten around Vercel-style PublicationCard.
 *
 * Per OQ.5 + OQ-F: one card per publisher account; existing surfaces (URL input bar,
 * SubstackImportCard, WordPressPluginCard, PlatformConnectModal mount) preserved.
 *
 * Per-source-row affordances (re-sync, delete, per-source pricing, per-source verify)
 * removed — those move to a Settings page in a later sub-session (OQ-D defers the
 * Settings page; not in 4.7.1 scope).
 *
 * Per OQ-A, the legacy `fetchSources` function (and its `last_synced_at` typo at the
 * old line 109) is gone. The new `usePublication` hook reads the correct `last_sync_at`
 * column. Closes KI #62 here.
 *
 * KI #58 (PlatformConnectModal legacy) and KI #59 (add-source flow reconciliation)
 * stay open — 4.7.2 owns the decommission. 4.7.1 leaves the URL bar + modal mount
 * untouched.
 */

interface SourcesViewProps {
  /** Kept for parent-call compat; current Phase 4.7.1 implementation does not use it. */
  onAddSource?: () => void;
}

export function SourcesView(_props: SourcesViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { platform: platformApiHook } = useAuthenticatedApi();
  const { publication, isLoading, error, refetch } = usePublication();

  // URL input + platform detection (kept until 4.7.2 decommission)
  const [connectUrl, setConnectUrl] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const handleDetectPlatform = async () => {
    const trimmed = connectUrl.trim();
    if (!trimmed) return;
    let normalizedUrl = trimmed;
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = "https://" + normalizedUrl;
    setIsDetecting(true);
    try {
      const result = await platformApiHook.detect(normalizedUrl);
      setDetectionResult(result);
      setShowConnectModal(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not detect platform for this URL.";
      toast({
        title: "Detection failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  };

  // URL input bar — kept per OQ-F until 4.7.2 decommissions PlatformConnectModal flow
  const urlInputBar = (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleDetectPlatform();
        }}
        className="flex items-center gap-3"
      >
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="https://yourpublication.com or substack URL…"
            value={connectUrl}
            onChange={(e) => setConnectUrl(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <Button
          type="submit"
          disabled={isDetecting || !connectUrl.trim()}
          className="h-11 px-6 bg-oxford hover:bg-oxford-dark text-white font-semibold shrink-0"
        >
          {isDetecting ? <Spinner size="md" className="mr-2" /> : null}
          Connect
        </Button>
      </form>
    </div>
  );

  // CTA handlers
  const handleImportContent = () => {
    // 4.7.1 v1: scroll to SubstackImportCard. 4.7.3 will replace with unified import modal.
    document.getElementById("import-cards")?.scrollIntoView({ behavior: "smooth" });
  };
  const handleViewLicenses = () => {
    navigate("/content");
  };
  const handleContinueSetup = () => {
    navigate("/setup-v2");
  };
  const handleContactSupport = () => {
    window.location.href = "mailto:support@opedd.com";
  };

  return (
    <div className="space-y-4">
      {urlInputBar}

      {/* Publication card (loading / error / loaded states) */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-12 flex items-center justify-center">
          <Spinner size="lg" className="text-oxford" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="bg-white rounded-xl border border-red-200 p-6 text-center space-y-3"
        >
          <p className="text-sm font-medium text-red-700">Couldn't load your publication</p>
          <p className="text-xs text-red-600">{error.message}</p>
          <Button
            type="button"
            size="sm"
            onClick={() => void refetch()}
            className="bg-oxford hover:bg-oxford-dark text-white"
          >
            Retry
          </Button>
        </div>
      ) : publication ? (
        <PublicationCard
          publication={publication}
          onImportContent={handleImportContent}
          onViewLicenses={handleViewLicenses}
          onContinueSetup={handleContinueSetup}
          onContactSupport={handleContactSupport}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-2">
          <p className="text-sm font-semibold text-navy-deep">No publisher record yet</p>
          <p className="text-xs text-navy-deep/50">
            Enter your publication URL above to get started.
          </p>
        </div>
      )}

      {/* Import + plugin cards (kept per OQ-F; 4.7.3 absorbs into unified import CTA) */}
      <div id="import-cards" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SubstackImportCard onImportComplete={() => void refetch()} />
        <WordPressPluginCard />
      </div>

      {/* PlatformConnectModal mount (kept per OQ-F; 4.7.2 decommissions per KI #58) */}
      {detectionResult && (
        <PlatformConnectModal
          open={showConnectModal}
          onOpenChange={setShowConnectModal}
          detection={detectionResult}
          url={
            connectUrl.trim().startsWith("http")
              ? connectUrl.trim()
              : `https://${connectUrl.trim()}`
          }
          onComplete={() => {
            setConnectUrl("");
            setDetectionResult(null);
            void refetch();
          }}
        />
      )}
    </div>
  );
}
