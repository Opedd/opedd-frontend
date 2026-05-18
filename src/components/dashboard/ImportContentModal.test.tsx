import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ImportContentModal } from "./ImportContentModal";

// The Custom API body uses react-router-dom's <Link> (cookbook link).
// Wrap all renders in MemoryRouter so that branch doesn't blow up on
// missing router context. Other platform bodies render fine without
// the wrapper, but the wrapper is a no-op cost for them.
function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

/**
 * Phase 11 UX-4 (2026-05-15) rewrote this modal from a 3-tab Radix Tabs
 * shape (Upload archive / Connect RSS / API) into a context-aware
 * single-body shape that branches on `platform`:
 *
 *   - "beehiiv" | "ghost" → "Sync now + last-synced + webhook posture" body
 *   - "substack"          → SubstackImportCard (ZIP upload)
 *   - "api"               → CSV upload + cookbook link
 *   - unknown / null      → legacy generic placeholder
 *
 * Pre-UX-4 tests asserted on tab elements + the Radix tab role; those
 * assertions are no-ops now (no tabs exist). This file replaces them
 * with per-platform body assertions that match the current rendered
 * shape (UX-4 follow-on sweep 2026-05-18 — Rules 16/17/18 sweep that
 * surfaced 4 stale unit tests blocking CI green).
 */

// Mock SubstackImportCard — exercising AuthContext + Supabase is out of
// scope for the modal-shell tests. The mock exposes a trigger button so
// the import-complete callback chain can be tested.
vi.mock("@/components/dashboard/SubstackImportCard", () => ({
  SubstackImportCard: ({ onImportComplete }: { onImportComplete?: () => void }) => (
    <div data-testid="substack-import-card">
      <button type="button" onClick={() => onImportComplete?.()}>
        mock-trigger-import-complete
      </button>
    </div>
  ),
}));

describe("ImportContentModal", () => {
  it("renders modal title and description (every platform)", () => {
    renderWithRouter(<ImportContentModal open={true} onOpenChange={() => {}} />);
    expect(screen.getByRole("heading", { name: /Import content/i })).toBeInTheDocument();
    // Description varies by platform; the fallback path renders the
    // "Pick a mechanism below" copy.
    expect(screen.getByText(/Pick a mechanism below/i)).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    renderWithRouter(<ImportContentModal open={false} onOpenChange={() => {}} />);
    expect(screen.queryByRole("heading", { name: /Import content/i })).not.toBeInTheDocument();
  });

  it("renders the Substack body when platform='substack'", () => {
    renderWithRouter(<ImportContentModal open={true} onOpenChange={() => {}} platform="substack" />);
    // SubstackImportCard (mocked) is the canonical substack body.
    expect(screen.getByTestId("substack-import-card")).toBeInTheDocument();
    // Description swaps to platform-specific copy.
    expect(screen.getByText(/Substack publication/i)).toBeInTheDocument();
  });

  it("renders the Beehiiv 'Sync now' body when platform='beehiiv'", () => {
    renderWithRouter(<ImportContentModal open={true} onOpenChange={() => {}} platform="beehiiv" lastSyncedAt={null} />);
    // Beehiiv body shows the "Last synced" line + webhook posture, NOT
    // the SubstackImportCard.
    expect(screen.queryByTestId("substack-import-card")).not.toBeInTheDocument();
    expect(screen.getByText(/Beehiiv publication/i)).toBeInTheDocument();
    expect(screen.getByText(/Last synced/i)).toBeInTheDocument();
  });

  it("renders the Ghost 'Sync now' body when platform='ghost'", () => {
    renderWithRouter(<ImportContentModal open={true} onOpenChange={() => {}} platform="ghost" lastSyncedAt={null} />);
    expect(screen.queryByTestId("substack-import-card")).not.toBeInTheDocument();
    expect(screen.getByText(/Ghost publication/i)).toBeInTheDocument();
  });

  it("renders the Custom API body when platform='api'", () => {
    renderWithRouter(<ImportContentModal open={true} onOpenChange={() => {}} platform="api" />);
    expect(screen.queryByTestId("substack-import-card")).not.toBeInTheDocument();
    expect(screen.getByText(/Custom API publication/i)).toBeInTheDocument();
  });

  it("Substack body — onImportComplete callback fires immediately; modal auto-closes after 2.5s delay (PFQ-C)", () => {
    vi.useFakeTimers();
    try {
      const onOpenChange = vi.fn();
      const onImportComplete = vi.fn();
      render(
        <ImportContentModal
          open={true}
          onOpenChange={onOpenChange}
          onImportComplete={onImportComplete}
          platform="substack"
        />,
      );
      fireEvent.click(screen.getByText("mock-trigger-import-complete"));
      // onImportComplete fires immediately (callback chain to parent runs sync)
      expect(onImportComplete).toHaveBeenCalledOnce();
      // Modal close is delayed 2.5s — banner inside SubstackImportCard renders during the window
      expect(onOpenChange).not.toHaveBeenCalled();
      vi.advanceTimersByTime(2499);
      expect(onOpenChange).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
