// Phase 5.4-β commit 2 — tests for PublisherLicensingPage's
// buildCards() rewrite (4-vocab × 3-payment-model matrix) +
// empty-state + API-discovery CTA.
//
// The page itself is a heavy component with article browsing,
// search, infinite-scroll, etc. These tests focus narrowly on the
// licensing-cards section + empty-state — the load-bearing 5.4-β
// behavior change. Article browse mechanics covered by manual
// regression in walk plan.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Mock react-router-dom params via Routes wrapper (simpler than mocking
// useParams directly).
vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

vi.mock("@/components/ui/Spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

import PublisherLicensingPage from "./PublisherLicensingPage";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

interface PublisherFixtureOpts {
  pricing_rules?: Record<string, unknown> | null;
  default_human_price?: number | null;
  default_ai_price?: number | null;
}

function publisherFixture(opts: PublisherFixtureOpts = {}) {
  return {
    id: "pub-1",
    name: "Test Publisher",
    description: "Test description",
    logo_url: null,
    website_url: "https://example.com",
    contact_email: "test@example.com",
    slug: "test-publisher",
    article_count: 0,
    verified: true,
    stripe_connected: true,
    default_human_price: opts.default_human_price ?? null,
    default_ai_price: opts.default_ai_price ?? null,
    pricing_rules: opts.pricing_rules ?? null,
  };
}

function mockApiCalls(pricing: Record<string, unknown> | null) {
  // Page makes 2 fetches on mount: publisher (action=publisher) +
  // articles (action=publisher_articles). Order matters in the
  // matcher — publisher_articles is more specific and must be
  // checked FIRST (substring `action=publisher` would also match
  // `action=publisher_articles`).
  fetchMock.mockImplementation(async (url: string | URL) => {
    const urlStr = String(url);
    if (urlStr.includes("action=publisher_articles")) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: { articles: [], total: 0, next_cursor: null },
        }),
      } as unknown as Response;
    }
    if (urlStr.includes("action=publisher")) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: publisherFixture({ pricing_rules: pricing }),
        }),
      } as unknown as Response;
    }
    return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/publisher/test-publisher"]}>
      <Routes>
        <Route path="/publisher/:publisherSlug" element={<PublisherLicensingPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ─── buildCards() — distinct cards per (license_type, payment_model) ─

describe("PublisherLicensingPage — distinct cards (Phase 5.4-β)", () => {
  it("renders empty-state when pricing_rules.license_types is empty", async () => {
    mockApiCalls({});
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("licensing-empty-state")).toBeInTheDocument();
    });
    expect(screen.getByText(/not currently accepting licenses/)).toBeInTheDocument();
    expect(screen.getByText(/explore our API integrations/)).toBeInTheDocument();
  });

  it("renders 1 card when only ai_retrieval.price_metered is set", async () => {
    mockApiCalls({
      license_types: { ai_retrieval: { price_metered: 0.005 } },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("AI Retrieval (metered)")).toBeInTheDocument();
    });
    expect(screen.getByText("$0.005/call")).toBeInTheDocument();
    expect(screen.queryByTestId("licensing-empty-state")).toBeNull();
  });

  it("renders 7 distinct cards when all valid combinations are set", async () => {
    mockApiCalls({
      license_types: {
        ai_training: { price: 50000, price_annual: 200000 },
        ai_retrieval: { price: 100, price_annual: 5000, price_metered: 0.005 },
        human_per_article: { price: 5 },
        human_full_archive: { price_annual: 1200 },
      },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("AI Training (one-time)")).toBeInTheDocument();
    });
    expect(screen.getByText("AI Training (annual)")).toBeInTheDocument();
    expect(screen.getByText("AI Retrieval (one-time)")).toBeInTheDocument();
    expect(screen.getByText("AI Retrieval (annual)")).toBeInTheDocument();
    expect(screen.getByText("AI Retrieval (metered)")).toBeInTheDocument();
    expect(screen.getByText("Per-article licensing")).toBeInTheDocument();
    expect(screen.getByText("Full archive (annual)")).toBeInTheDocument();
  });

  it("formats prices correctly per payment_model", async () => {
    mockApiCalls({
      license_types: {
        ai_retrieval: { price_annual: 5000, price_metered: 0.005 },
        human_per_article: { price: 5 },
      },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("$5,000/year")).toBeInTheDocument(); // toLocaleString
    });
    expect(screen.getByText("$0.005/call")).toBeInTheDocument(); // sub-cent metered
    expect(screen.getByText("$5/article")).toBeInTheDocument(); // simple single-digit
  });

  it("does NOT render legacy keys (editorial, syndication, corporate) — even if a stale publisher had them, the new buildCards doesn't read them", async () => {
    mockApiCalls({
      license_types: {
        editorial: { enabled: true, price_per_article: 10 },
        syndication: { enabled: true, price_per_article: 20 },
        corporate: { enabled: true, price_annual: 5000 },
      } as Record<string, unknown>,
    });
    renderPage();

    // Empty-state because no 4-vocab keys set
    await waitFor(() => {
      expect(screen.getByTestId("licensing-empty-state")).toBeInTheDocument();
    });
    // Stale legacy labels NOT rendered
    expect(screen.queryByText("Editorial Use")).toBeNull();
    expect(screen.queryByText("Syndication")).toBeNull();
    expect(screen.queryByText("Corporate Blanket")).toBeNull();
  });

  it("ignores price=0 entries (treated as disabled)", async () => {
    mockApiCalls({
      license_types: {
        ai_retrieval: { price: 0, price_metered: 0.005 },
        human_per_article: { price: 0 },
      },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("AI Retrieval (metered)")).toBeInTheDocument();
    });
    // price=0 entries don't render cards
    expect(screen.queryByText("AI Retrieval (one-time)")).toBeNull();
    expect(screen.queryByText("Per-article licensing")).toBeNull();
  });
});

// ─── API-discovery CTA ──────────────────────────────────────────

describe("PublisherLicensingPage — API-discovery CTA (Phase 5.4-β / C.3 alignment)", () => {
  it("renders 'Integrate via API →' CTA below cards when at least one card is shown", async () => {
    mockApiCalls({
      license_types: { ai_retrieval: { price_metered: 0.005 } },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("api-discovery-cta")).toBeInTheDocument();
    });
    const link = screen.getByTestId("api-discovery-cta") as HTMLAnchorElement;
    expect(link.href).toBe("https://docs.opedd.com/quickstart");
    expect(link.target).toBe("_blank");
    expect(link.textContent).toContain("Integrate via API");
  });

  it("does NOT render API-discovery CTA when empty-state is shown (empty-state has its own API link)", async () => {
    mockApiCalls({});
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("licensing-empty-state")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("api-discovery-cta")).toBeNull();
    // Empty-state has its own API link inline
    expect(screen.getByText(/explore our API integrations/)).toBeInTheDocument();
  });
});
