import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PublicationCard } from "./PublicationCard";
import type { Publication } from "@/types/dashboard";

function pub(overrides: Partial<Publication> = {}): Publication {
  return {
    id: "c3fb155f-340f-4595-88c2-0fe93b969c38",
    name: "Matter of fact",
    logoUrl: "https://example.com/logo.png",
    publicationUrl: "https://opedd.substack.com",
    verificationStatus: "verified",
    setupState: "verified",
    setupStep: 5,
    setupComplete: true,
    licenseCount: 21,
    contentSources: {
      last_sync_at: "2026-04-30T10:00:00.000Z",
      sync_status: "active",
      url: "https://opedd.substack.com",
      rowCount: 1,
    },
    primaryCTA: "view_licenses",
    brandingData: {
      name: "Matter of fact",
      logo_url: "https://example.com/logo.png",
      primary_color: "#eff6ff",
      source: "substack",
    },
    ...overrides,
  };
}

describe("PublicationCard", () => {
  it("renders branding logo from branding_data.logo_url", () => {
    render(<PublicationCard publication={pub()} />);
    const img = screen.getByAltText("Matter of fact") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/logo.png");
  });

  it("falls back to Google favicon when logoUrl is null", () => {
    render(<PublicationCard publication={pub({ logoUrl: null })} />);
    const img = screen.getByAltText("Matter of fact") as HTMLImageElement;
    expect(img.src).toContain("google.com/s2/favicons");
    expect(img.src).toContain("opedd.substack.com");
  });

  it("renders initial-letter avatar when both logoUrl and publicationUrl are null", () => {
    render(<PublicationCard publication={pub({ logoUrl: null, publicationUrl: null })} />);
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("renders publication name", () => {
    render(<PublicationCard publication={pub()} />);
    expect(screen.getByText("Matter of fact")).toBeInTheDocument();
  });

  it("renders publication URL", () => {
    render(<PublicationCard publication={pub()} />);
    expect(screen.getByText("https://opedd.substack.com")).toBeInTheDocument();
  });

  it("renders Verified badge when verificationStatus='verified'", () => {
    render(<PublicationCard publication={pub()} />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("renders Pending badge when verificationStatus='pending'", () => {
    render(<PublicationCard publication={pub({ verificationStatus: "pending" })} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders Suspended badge when verificationStatus='suspended'", () => {
    render(<PublicationCard publication={pub({ verificationStatus: "suspended" })} />);
    expect(screen.getByText("Suspended")).toBeInTheDocument();
  });

  it("renders license count populated", () => {
    render(<PublicationCard publication={pub({ licenseCount: 21 })} />);
    expect(screen.getByText("21 articles")).toBeInTheDocument();
  });

  it("renders license count zero with correct singular", () => {
    render(<PublicationCard publication={pub({ licenseCount: 0 })} />);
    expect(screen.getByText("0 articles")).toBeInTheDocument();
  });

  it("renders 'Never synced' when contentSources is null", () => {
    render(<PublicationCard publication={pub({ contentSources: null })} />);
    expect(screen.getByText("Never synced")).toBeInTheDocument();
  });

  it("renders relative time when last_sync_at is set", () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
    render(
      <PublicationCard
        publication={pub({
          contentSources: {
            last_sync_at: recent,
            sync_status: "active",
            url: "https://opedd.substack.com",
            rowCount: 1,
          },
        })}
      />,
    );
    expect(screen.getByText(/Synced 5m ago/)).toBeInTheDocument();
  });

  it("primary CTA 'View licenses' fires onViewLicenses when verified+licenseCount>0", () => {
    const onViewLicenses = vi.fn();
    render(<PublicationCard publication={pub()} onViewLicenses={onViewLicenses} />);
    fireEvent.click(screen.getByRole("button", { name: /View licenses/i }));
    expect(onViewLicenses).toHaveBeenCalledOnce();
  });

  it("primary CTA 'Import content' fires onImportContent when verified+licenseCount=0", () => {
    const onImportContent = vi.fn();
    render(
      <PublicationCard
        publication={pub({ licenseCount: 0, primaryCTA: "import_content" })}
        onImportContent={onImportContent}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Import content/i }));
    expect(onImportContent).toHaveBeenCalledOnce();
  });

  it("primary CTA 'Continue setup' fires onContinueSetup", () => {
    const onContinueSetup = vi.fn();
    render(
      <PublicationCard
        publication={pub({ setupComplete: false, primaryCTA: "continue_setup" })}
        onContinueSetup={onContinueSetup}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Continue setup/i }));
    expect(onContinueSetup).toHaveBeenCalledOnce();
  });

  it("OQ-C contradiction hint surfaces when verified+setup_complete=false", () => {
    render(
      <PublicationCard
        publication={pub({ setupComplete: false, primaryCTA: "continue_setup" })}
      />,
    );
    expect(
      screen.getByText(/Verification done — finish the rest of setup/i),
    ).toBeInTheDocument();
  });

  it("OQ-C contradiction hint hidden when setup_complete=true", () => {
    render(<PublicationCard publication={pub()} />);
    expect(
      screen.queryByText(/Verification done — finish the rest of setup/i),
    ).not.toBeInTheDocument();
  });

  it("renders Visit link with publicationUrl", () => {
    render(<PublicationCard publication={pub()} />);
    const link = screen.getByRole("link", { name: /Visit/i }) as HTMLAnchorElement;
    expect(link.href).toBe("https://opedd.substack.com/");
  });

  it("hides Visit link when publicationUrl is null", () => {
    render(<PublicationCard publication={pub({ publicationUrl: null, logoUrl: null })} />);
    expect(screen.queryByRole("link", { name: /Visit/i })).not.toBeInTheDocument();
  });

  // Phase 4.7.3 PFQ-6 (ii): secondary "Import content" link for established publishers.

  it("renders secondary Import content link when verified+licenseCount>0", () => {
    render(<PublicationCard publication={pub()} />);
    // Two buttons: primary "View licenses" + secondary "Import content".
    const buttons = screen.getAllByRole("button");
    const importBtn = buttons.find((b) => /Import content/i.test(b.textContent ?? ""));
    expect(importBtn).toBeDefined();
  });

  it("hides secondary Import content link when verified+licenseCount=0 (primary already Import content)", () => {
    // Primary CTA IS import_content here; secondary would be a duplicate so we hide it.
    render(<PublicationCard publication={pub({ licenseCount: 0, primaryCTA: "import_content" })} />);
    const buttons = screen.getAllByRole("button");
    const importBtns = buttons.filter((b) => /Import content/i.test(b.textContent ?? ""));
    expect(importBtns.length).toBe(1); // primary only
  });

  it("hides secondary Import content link when not verified", () => {
    render(<PublicationCard publication={pub({ verificationStatus: "pending", primaryCTA: "continue_setup" })} />);
    const buttons = screen.getAllByRole("button");
    const importBtns = buttons.filter((b) => /Import content/i.test(b.textContent ?? ""));
    expect(importBtns.length).toBe(0);
  });

  it("clicking secondary Import content link fires onImportContent", () => {
    const onImportContent = vi.fn();
    render(<PublicationCard publication={pub()} onImportContent={onImportContent} />);
    // pub() default has primaryCTA="view_licenses" — click the secondary.
    const importBtn = screen
      .getAllByRole("button")
      .find((b) => /Import content/i.test(b.textContent ?? ""));
    if (!importBtn) throw new Error("secondary Import content button not found");
    fireEvent.click(importBtn);
    expect(onImportContent).toHaveBeenCalledOnce();
  });
});
