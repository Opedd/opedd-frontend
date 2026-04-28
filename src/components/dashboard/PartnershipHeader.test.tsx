import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@sentry/react", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));
import * as Sentry from "@sentry/react";

const mockGetAccessToken = vi.fn(async () => "test-jwt");
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ getAccessToken: mockGetAccessToken, user: { id: "u1" } }),
}));

const mockBrandingGet = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    brandingApi: {
      get: (...args: unknown[]) => mockBrandingGet(...args),
    },
  };
});

import { PartnershipHeader } from "./PartnershipHeader";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PartnershipHeader", () => {
  it("01: renders full partnership state — logo + name + primary_color tint", async () => {
    mockBrandingGet.mockResolvedValue({
      branding_data: {
        logo_url: "https://cdn.example.com/sub-logo.png",
        name: "ChinaTalk",
        primary_color: "#0070f3",
        extracted_at: "2026-04-28T12:00:00Z",
        source: "substack",
      },
      has_branding: true,
    });

    render(<PartnershipHeader />);
    await waitFor(() => expect(mockBrandingGet).toHaveBeenCalled());

    const header = await screen.findByTestId("partnership-header");
    expect(header).toBeInTheDocument();

    // Publisher logo
    const pubLogo = screen.getByAltText("ChinaTalk");
    expect(pubLogo).toHaveAttribute("src", "https://cdn.example.com/sub-logo.png");

    // Name text
    expect(screen.getByText("ChinaTalk")).toBeInTheDocument();

    // primary_color rendered as flat hex+alpha background tint.
    // Component appends "10" to 6-digit hex for ~6% alpha intensity.
    const headerEl = header as HTMLElement;
    expect(headerEl.style.backgroundColor).not.toBe("");
    // JSDOM normalizes hex to rgba(); assert the rgb values back. 0070f3
    // → r=0, g=112, b=243.
    expect(headerEl.style.backgroundColor.toLowerCase()).toMatch(
      /(rgba?\(0,\s*112,\s*243|#0070f310)/,
    );
  });

  it("02: renders with name only (logo missing) — Opedd × text", async () => {
    mockBrandingGet.mockResolvedValue({
      branding_data: {
        name: "The Generalist",
        source: "substack",
      },
      has_branding: true,
    });

    render(<PartnershipHeader />);
    await waitFor(() => expect(mockBrandingGet).toHaveBeenCalled());

    expect(await screen.findByText("The Generalist")).toBeInTheDocument();
    // Opedd icon is always present
    expect(screen.getByAltText("Opedd")).toBeInTheDocument();
    // No publisher logo image (only the Opedd one)
    const allImages = screen.getAllByRole("img");
    expect(allImages).toHaveLength(1);
  });

  it("03: renders with logo only (name missing) — Opedd × logo", async () => {
    mockBrandingGet.mockResolvedValue({
      branding_data: {
        logo_url: "https://cdn.example.com/logo.png",
        source: "substack",
      },
      has_branding: true,
    });

    render(<PartnershipHeader />);
    await waitFor(() => expect(mockBrandingGet).toHaveBeenCalled());

    expect(await screen.findByTestId("partnership-header")).toBeInTheDocument();
    // Publisher logo present (alt falls back to "Publisher logo")
    expect(screen.getByAltText("Publisher logo")).toHaveAttribute(
      "src",
      "https://cdn.example.com/logo.png",
    );
    // Opedd icon also present
    expect(screen.getByAltText("Opedd")).toBeInTheDocument();
  });

  it("04: returns null when both logo_url and name are missing", async () => {
    mockBrandingGet.mockResolvedValue({
      branding_data: {
        primary_color: "#abcdef",
        extracted_at: "2026-04-28T12:00:00Z",
        source: "substack",
      },
      has_branding: false,
    });

    const { container } = render(<PartnershipHeader />);
    // Wait for fetch to settle — initial render is the skeleton, then null
    await waitFor(() => expect(mockBrandingGet).toHaveBeenCalled());
    await waitFor(() => {
      expect(
        screen.queryByTestId("partnership-header-skeleton"),
      ).not.toBeInTheDocument();
    });
    expect(container.firstChild).toBeNull();
  });

  it("05: returns null on fetch error and captures Sentry breadcrumb", async () => {
    mockBrandingGet.mockRejectedValue(new Error("extract-branding 500"));

    const { container } = render(<PartnershipHeader />);
    await waitFor(() => expect(mockBrandingGet).toHaveBeenCalled());
    await waitFor(() => {
      expect(
        screen.queryByTestId("partnership-header-skeleton"),
      ).not.toBeInTheDocument();
    });

    expect(container.firstChild).toBeNull();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: "partnership-header" }),
    );
  });

  it("06: sanitizes invalid primary_color — no inline gradient, no script in DOM", async () => {
    mockBrandingGet.mockResolvedValue({
      branding_data: {
        name: "Risky Publication",
        primary_color: "<script>alert(1)</script>",
        source: "substack",
      },
      has_branding: true,
    });

    render(<PartnershipHeader />);
    await waitFor(() => expect(mockBrandingGet).toHaveBeenCalled());

    const header = await screen.findByTestId("partnership-header");
    // No inline tint applied (invalid hex rejected by sanitizer).
    const headerEl = header as HTMLElement;
    expect(headerEl.style.backgroundColor).toBe("");
    // No script element injected anywhere in the DOM
    expect(document.querySelector("script[data-injected]")).toBeNull();
    expect(header.innerHTML).not.toContain("<script");
  });

  it("07: shows skeleton while fetch in flight", () => {
    // Pending promise — never resolves during this test
    mockBrandingGet.mockImplementation(() => new Promise(() => {}));
    render(<PartnershipHeader />);
    expect(screen.getByTestId("partnership-header-skeleton")).toBeInTheDocument();
  });
});
