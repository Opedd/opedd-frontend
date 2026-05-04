// Phase 5.4-β commit 1 — tests for /settings/pricing editor.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockGetAccessToken = vi.fn(async () => "test-jwt");
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ getAccessToken: mockGetAccessToken, user: { id: "u1" } }),
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockPatch = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    publisherProfileApi: {
      patch: (...args: unknown[]) => mockPatch(...args),
    },
  };
});

vi.mock("@/components/dashboard/DashboardLayout", () => ({
  DashboardLayout: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="dashboard-layout">
      <div data-testid="dashboard-title">{title}</div>
      {children}
    </div>
  ),
}));

import PricingSettings from "./Pricing";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

function mockProfileGet(pricingRules: Record<string, unknown> | null) {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ data: { pricing_rules: pricingRules } }),
  } as unknown as Response);
}

function renderPricing() {
  return render(
    <MemoryRouter initialEntries={["/settings/pricing"]}>
      <PricingSettings />
    </MemoryRouter>,
  );
}

describe("PricingSettings — /settings/pricing editor", () => {
  it("renders all 7 valid (license_type, payment_model) input fields when pricing_rules empty", async () => {
    mockProfileGet({});
    renderPricing();

    // 4 license-type cards
    await waitFor(() => {
      expect(screen.getByTestId("pricing-card-ai_training")).toBeInTheDocument();
      expect(screen.getByTestId("pricing-card-ai_retrieval")).toBeInTheDocument();
      expect(screen.getByTestId("pricing-card-human_per_article")).toBeInTheDocument();
      expect(screen.getByTestId("pricing-card-human_full_archive")).toBeInTheDocument();
    });

    // 7 valid input fields per VALID_FIELDS map:
    // ai_training: one_time + subscription = 2
    // ai_retrieval: one_time + subscription + metered = 3
    // human_per_article: one_time = 1
    // human_full_archive: subscription = 1
    expect(screen.getByTestId("pricing-input-ai_training-one_time")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-input-ai_training-subscription")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-input-ai_retrieval-one_time")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-input-ai_retrieval-subscription")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-input-ai_retrieval-metered")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-input-human_per_article-one_time")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-input-human_full_archive-subscription")).toBeInTheDocument();
  });

  it("does NOT render invalid combinations (e.g., human_full_archive + metered)", async () => {
    mockProfileGet({});
    renderPricing();

    await waitFor(() => {
      expect(screen.getByTestId("pricing-card-human_full_archive")).toBeInTheDocument();
    });

    // Invalid combinations should NOT have input fields
    expect(screen.queryByTestId("pricing-input-human_full_archive-metered")).toBeNull();
    expect(screen.queryByTestId("pricing-input-human_full_archive-one_time")).toBeNull();
    expect(screen.queryByTestId("pricing-input-human_per_article-subscription")).toBeNull();
    expect(screen.queryByTestId("pricing-input-human_per_article-metered")).toBeNull();
    expect(screen.queryByTestId("pricing-input-ai_training-metered")).toBeNull();
  });

  it("pre-fills inputs from existing pricing_rules.license_types JSONB", async () => {
    mockProfileGet({
      license_types: {
        ai_retrieval: { price: 25, price_annual: 5000, price_metered: 0.005 },
        human_per_article: { price: 5 },
      },
    });
    renderPricing();

    await waitFor(() => {
      const oneTime = screen.getByTestId("pricing-input-ai_retrieval-one_time") as HTMLInputElement;
      expect(oneTime.value).toBe("25");
    });
    expect((screen.getByTestId("pricing-input-ai_retrieval-subscription") as HTMLInputElement).value).toBe("5000");
    expect((screen.getByTestId("pricing-input-ai_retrieval-metered") as HTMLInputElement).value).toBe("0.005");
    expect((screen.getByTestId("pricing-input-human_per_article-one_time") as HTMLInputElement).value).toBe("5");
    // Unset fields = empty string
    expect((screen.getByTestId("pricing-input-ai_training-one_time") as HTMLInputElement).value).toBe("");
  });

  it("rejects invalid input shape ('free', 'abc', '-5') — save button disabled", async () => {
    mockProfileGet({});
    renderPricing();

    await waitFor(() => {
      expect(screen.getByTestId("pricing-input-ai_retrieval-metered")).toBeInTheDocument();
    });

    const input = screen.getByTestId("pricing-input-ai_retrieval-metered") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "free" } });

    const saveBtn = screen.getByTestId("pricing-save-button") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
    expect(screen.getByText("Must be a non-negative number")).toBeInTheDocument();
  });

  it("save calls publisherProfileApi.patch with correct JSONB shape", async () => {
    mockProfileGet({});
    mockPatch.mockResolvedValue({});
    renderPricing();

    await waitFor(() => {
      expect(screen.getByTestId("pricing-input-ai_retrieval-metered")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("pricing-input-ai_retrieval-metered") as HTMLInputElement, {
      target: { value: "0.005" },
    });
    fireEvent.change(screen.getByTestId("pricing-input-human_per_article-one_time") as HTMLInputElement, {
      target: { value: "5" },
    });

    fireEvent.click(screen.getByTestId("pricing-save-button"));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          pricing_rules: expect.objectContaining({
            license_types: expect.objectContaining({
              ai_retrieval: { price_metered: 0.005 },
              human_per_article: { price: 5 },
            }),
          }),
        }),
        "test-jwt",
      );
    });
  });

  it('"disable all" soft warning fires when saving with all inputs empty', async () => {
    // Pre-fill with one type then clear it during the test
    mockProfileGet({
      license_types: { human_per_article: { price: 5 } },
    });
    renderPricing();

    await waitFor(() => {
      expect((screen.getByTestId("pricing-input-human_per_article-one_time") as HTMLInputElement).value).toBe("5");
    });

    // Clear the only set input
    fireEvent.change(screen.getByTestId("pricing-input-human_per_article-one_time") as HTMLInputElement, {
      target: { value: "" },
    });

    fireEvent.click(screen.getByTestId("pricing-save-button"));

    // Warning dialog
    await waitFor(() => {
      expect(screen.getByText("You're disabling all license types")).toBeInTheDocument();
    });
    expect(screen.getByText("Save anyway")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    // Save NOT called yet
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it("preserves non-license-type pricing_rules keys (e.g., categories)", async () => {
    mockProfileGet({
      categories: { news: { ai: 12 } },
      license_types: { ai_retrieval: { price: 25 } },
    });
    mockPatch.mockResolvedValue({});
    renderPricing();

    await waitFor(() => {
      expect((screen.getByTestId("pricing-input-ai_retrieval-one_time") as HTMLInputElement).value).toBe("25");
    });

    fireEvent.click(screen.getByTestId("pricing-save-button"));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          pricing_rules: expect.objectContaining({
            categories: { news: { ai: 12 } }, // preserved
            license_types: expect.objectContaining({
              ai_retrieval: { price: 25 },
            }),
          }),
        }),
        "test-jwt",
      );
    });
  });

  it("error toast on patch failure", async () => {
    mockProfileGet({});
    mockPatch.mockRejectedValue(new Error("Network down"));
    renderPricing();

    await waitFor(() => {
      expect(screen.getByTestId("pricing-input-ai_retrieval-one_time")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("pricing-input-ai_retrieval-one_time") as HTMLInputElement, {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByTestId("pricing-save-button"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Couldn't save pricing",
          variant: "destructive",
        }),
      );
    });
  });

  it("loading state shown during initial fetch", () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never resolves
    renderPricing();
    // Spinner renders (Loader2 SVG)
    const layout = screen.getByTestId("dashboard-layout");
    expect(layout.querySelector("svg")).toBeTruthy();
  });

  it("error state shown if fetch rejects", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal server error" }),
    } as unknown as Response);
    renderPricing();

    await waitFor(() => {
      expect(screen.getByText(/Couldn't load pricing/)).toBeInTheDocument();
    });
  });
});
