import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePublication } from "@/hooks/usePublication";
import { PublicationCard } from "@/components/dashboard/PublicationCard";
import { ImportContentModal } from "@/components/dashboard/ImportContentModal";
import { WordPressPluginCard } from "@/components/dashboard/WordPressPluginCard";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Phase 4.7.3 — SourcesView wires PublicationCard to the unified ImportContentModal
 * per OQ.4 (single Import content CTA, multiple mechanisms inside).
 *
 * State (PFQ-4 α): modal open/close lives here. Opened by PublicationCard's primary
 * "Import content" CTA (verified + licenseCount=0) OR secondary "Import content"
 * link (verified + licenseCount > 0; PFQ-6 ii).
 *
 * SubstackImportCard absorbed into modal Upload-archive tab (PFQ-1 α). No longer
 * mounted standalone in SourcesView.
 *
 * WordPressPluginCard left standalone per PFQ-3 α + KI #64 (WordPress integration
 * scope undecided; cleanup-audit Phase 4.7.6 owns the WP go/no-go decision).
 */

export function SourcesView() {
  const navigate = useNavigate();
  const { publication, isLoading, error, refetch } = usePublication();
  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleImportContent = () => setIsImportOpen(true);
  const handleViewLicenses = () => navigate("/content");
  const handleContinueSetup = () => navigate("/setup-v2");
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

      {/* WordPressPluginCard kept standalone per PFQ-3 α + KI #64 — Phase 4.7.6 audit
          owns the go/no-go on absorbing/removing/keeping WordPress integration. */}
      <WordPressPluginCard />

      <ImportContentModal
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImportComplete={() => void refetch()}
      />
    </div>
  );
}
