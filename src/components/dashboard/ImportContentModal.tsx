import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, Rss, Code2 } from "lucide-react";
import { SubstackImportCard } from "@/components/dashboard/SubstackImportCard";

/**
 * Phase 4.7.3 — Unified Import Content modal.
 *
 * One modal-shell for all content-import mechanisms per OQ.4 (single CTA, multiple
 * mechanisms inside). Tabs:
 *   - Upload archive: wraps existing SubstackImportCard (PFQ-1 option a, as-is).
 *   - Connect RSS: honest "coming soon" placeholder per PFQ-2 (β).
 *   - Future API: placeholder for Phase 6-9 platform connectors.
 *
 * State owned by SourcesView per PFQ-4 (α). Modal opens via PublicationCard's
 * primary "Import content" CTA (verified + licenseCount=0) OR secondary
 * "Import content" link (verified + licenseCount > 0; PFQ-6 option ii).
 *
 * KI #57 (SubstackImportCard click-handler bug) stays untouched; 4.7.5 owns it
 * regardless of where the component renders.
 */

export interface ImportContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires when the upload completes successfully — used to refetch publication state. */
  onImportComplete?: () => void;
}

export function ImportContentModal({ open, onOpenChange, onImportComplete }: ImportContentModalProps) {
  const handleImportComplete = () => {
    onImportComplete?.();
    // Auto-close on successful import; founder can dismiss manually otherwise.
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-xl rounded-xl border border-gray-200 p-6 shadow-modal">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-navy-deep">Import content</DialogTitle>
          <DialogDescription className="text-sm text-navy-deep/60 mt-1">
            Add content to your publication. Pick a mechanism below.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="mt-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="upload" className="gap-1.5 text-xs">
              <Upload size={12} />
              Upload archive
            </TabsTrigger>
            <TabsTrigger value="rss" className="gap-1.5 text-xs">
              <Rss size={12} />
              Connect RSS
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-1.5 text-xs">
              <Code2 size={12} />
              API
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            <SubstackImportCard onImportComplete={handleImportComplete} />
          </TabsContent>

          <TabsContent value="rss" className="mt-4">
            <div
              role="status"
              className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center space-y-2"
            >
              <Rss size={24} className="text-gray-400 mx-auto" />
              <p className="text-sm font-medium text-navy-deep">RSS feed import — coming soon</p>
              <p className="text-xs text-navy-deep/60">
                Connect an RSS feed to keep your archive in sync. We'll email you when this ships.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="api" className="mt-4">
            <div
              role="status"
              className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center space-y-2"
            >
              <Code2 size={24} className="text-gray-400 mx-auto" />
              <p className="text-sm font-medium text-navy-deep">Platform API — coming soon</p>
              <p className="text-xs text-navy-deep/60">
                Direct API connectors for Beehiiv, Ghost, WordPress, and Custom platforms ship in
                Phases 6-9. We'll email you when each is ready.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
