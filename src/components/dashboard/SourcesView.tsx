import { useNavigate } from "react-router-dom";
import { usePublication } from "@/hooks/usePublication";
import { PublicationCard } from "@/components/dashboard/PublicationCard";
import { SubstackImportCard } from "@/components/dashboard/SubstackImportCard";
import { WordPressPluginCard } from "@/components/dashboard/WordPressPluginCard";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Phase 4.7.2 — SourcesView shrinks again. URL input bar + PlatformConnectModal
 * mount removed per OQ.3 (no add-source flow in v1). Closes KI #58 + #59.
 *
 * Phase 4.7.1 baseline (kept): one Vercel-style PublicationCard per publisher
 * account; SubstackImportCard + WordPressPluginCard preserved for content
 * import (4.7.3 will absorb both into a unified "Import content" CTA).
 *
 * Phase 4.7.5 will fix KI #57 (SubstackImportCard upload click bug).
 */

export function SourcesView() {
  const navigate = useNavigate();
  const { publication, isLoading, error, refetch } = usePublication();

  const handleImportContent = () => {
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
            Complete onboarding from the wizard to set up your publication.
          </p>
        </div>
      )}

      <div id="import-cards" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SubstackImportCard onImportComplete={() => void refetch()} />
        <WordPressPluginCard />
      </div>
    </div>
  );
}
