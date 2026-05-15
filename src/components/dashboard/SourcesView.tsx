import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePublication } from "@/hooks/usePublication";
import { useWizardState } from "@/hooks/useWizardState";
import { PublicationCard } from "@/components/dashboard/PublicationCard";
import { ImportContentModal } from "@/components/dashboard/ImportContentModal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";

/**
 * SourcesView wires PublicationCard to the unified ImportContentModal.
 * Modal opens via PublicationCard's "Import content" CTA.
 *
 * Phase 11 close-validation pass UX-4 (2026-05-15): passes platform +
 * last_sync_at through to ImportContentModal for context-aware rendering.
 * Platform sourced from useWizardState's setup_data.platform; last_sync_at
 * sourced from publication.contentSources aggregation per OQ-E.
 */

export function SourcesView() {
  const navigate = useNavigate();
  const { publication, isLoading, error, refetch } = usePublication();
  const wizardState = useWizardState();
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

      <ImportContentModal
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImportComplete={() => void refetch()}
        platform={(wizardState.setupData?.platform as string | undefined) ?? null}
        lastSyncedAt={publication?.contentSources?.last_sync_at ?? null}
      />
    </div>
  );
}
