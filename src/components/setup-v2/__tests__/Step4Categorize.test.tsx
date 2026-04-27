import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

vi.mock("@sentry/react", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

import type { UseWizardStateResult } from "@/hooks/useWizardState";
import type { WizardStep } from "@/lib/api";

const mockGetAccessToken = vi.fn(async () => "test-jwt");
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ getAccessToken: mockGetAccessToken, user: { id: "u1" } }),
}));

const mockHookReturn = vi.fn<() => UseWizardStateResult>();
vi.mock("@/hooks/useWizardState", () => ({
  useWizardState: () => mockHookReturn(),
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

import { Step4Categorize } from "../Step4Categorize";

function defaultWizardState(
  overrides: Partial<UseWizardStateResult> = {},
): UseWizardStateResult {
  return {
    state: { publisher_id: "p1", setup_state: "in_setup", setup_step: 4, setup_data: {} } as never,
    setupState: "in_setup",
    currentStep: 4 as WizardStep,
    setupData: {},
    dormant: false,
    canAdvance: true,
    canRegress: false,
    nextStep: 4 as WizardStep,
    prevStep: null,
    isLoading: false,
    isFetching: false,
    isMutating: false,
    isOffline: false,
    error: null,
    advance: vi.fn().mockResolvedValue({}),
    regress: vi.fn(),
    saveStepData: vi.fn(),
    refetch: vi.fn(),
    ...overrides,
  };
}

interface ProfileSlice {
  category?: string | null;
  default_human_price?: number;
  default_ai_price?: number;
  pricing_rules?: Record<string, unknown>;
}

function mockProfileFetch(slice: ProfileSlice = {}): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ data: slice }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
}

function Wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  mockHookReturn.mockReturnValue(defaultWizardState());
  mockPatch.mockResolvedValue({});
});

describe("Step4Categorize — initial render", () => {
  it("01. renders category picker (12 options + Other), 3 price inputs, 3 license-type checkboxes, retrieval-only toggle, Continue button", async () => {
    mockProfileFetch();
    render(<Wrapper><Step4Categorize /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /primary domain/i })).toBeTruthy();
    });

    // Category select: 11 named options + "Select" placeholder = 12
    const select = screen.getByRole("combobox", { name: /primary domain/i }) as HTMLSelectElement;
    // 12 base entries (10 named categories + "Other (specify)" + "Select…"
    // placeholder) — verify a few canonical ones present
    expect(select.querySelectorAll("option").length).toBeGreaterThanOrEqual(11);
    expect(screen.getByText("Geopolitics")).toBeTruthy();
    expect(screen.getByText("Other (specify)")).toBeTruthy();

    // Price inputs
    expect(screen.getByLabelText(/Annual catalog license/i)).toBeTruthy();
    expect(screen.getByLabelText(/Per-article AI training/i)).toBeTruthy();
    expect(screen.getByLabelText(/Per-article human research/i)).toBeTruthy();

    // License-type checkboxes
    expect(screen.getByLabelText("AI training")).toBeTruthy();
    expect(screen.getByLabelText("Retrieval / RAG")).toBeTruthy();
    expect(screen.getByLabelText("Human research")).toBeTruthy();

    // Retrieval-only mode toggle
    expect(screen.getByLabelText(/Switch to retrieval-only mode/i)).toBeTruthy();

    // Continue button
    expect(screen.getByRole("button", { name: /Continue/i })).toBeTruthy();
  });
});

describe("Step4Categorize — category picker", () => {
  it("02. selecting a named category from dropdown updates state", async () => {
    mockProfileFetch();
    render(<Wrapper><Step4Categorize /></Wrapper>);
    const select = await screen.findByRole<HTMLSelectElement>("combobox", { name: /primary domain/i });

    fireEvent.change(select, { target: { value: "Geopolitics" } });
    expect(select.value).toBe("Geopolitics");
    // Free-text input should NOT appear for named categories
    expect(screen.queryByLabelText(/Custom category/i)).toBeNull();
  });

  it("03. selecting 'Other (specify)' reveals free-text input; typing updates state", async () => {
    mockProfileFetch();
    render(<Wrapper><Step4Categorize /></Wrapper>);
    const select = await screen.findByRole<HTMLSelectElement>("combobox", { name: /primary domain/i });

    fireEvent.change(select, { target: { value: "__OTHER__" } });
    const textInput = await screen.findByLabelText<HTMLInputElement>(/Custom category/i);

    fireEvent.change(textInput, { target: { value: "Renewable Aviation Policy" } });
    expect(textInput.value).toBe("Renewable Aviation Policy");
  });
});

describe("Step4Categorize — price inputs", () => {
  it("04. editing per-article human price updates state", async () => {
    mockProfileFetch();
    render(<Wrapper><Step4Categorize /></Wrapper>);
    const input = await screen.findByLabelText<HTMLInputElement>(
      /Per-article human research/i,
    );
    fireEvent.change(input, { target: { value: "12.50" } });
    expect(input.value).toBe("12.50");
  });

  it("05. editing per-article AI price updates state", async () => {
    mockProfileFetch();
    render(<Wrapper><Step4Categorize /></Wrapper>);
    const input = await screen.findByLabelText<HTMLInputElement>(
      /Per-article AI training/i,
    );
    fireEvent.change(input, { target: { value: "75" } });
    expect(input.value).toBe("75");
  });

  it("06. editing annual catalog price updates state", async () => {
    mockProfileFetch();
    render(<Wrapper><Step4Categorize /></Wrapper>);
    const input = await screen.findByLabelText<HTMLInputElement>(
      /Annual catalog license/i,
    );
    fireEvent.change(input, { target: { value: "60000" } });
    expect(input.value).toBe("60000");
  });
});

describe("Step4Categorize — license-type checkboxes", () => {
  it("07. toggling Retrieval/RAG checkbox flips local state", async () => {
    mockProfileFetch();
    render(<Wrapper><Step4Categorize /></Wrapper>);
    const cb = await screen.findByLabelText<HTMLInputElement>("Retrieval / RAG");
    expect(cb.checked).toBe(true); // default true
    fireEvent.click(cb);
    expect(cb.checked).toBe(false);
  });
});

describe("Step4Categorize — retrieval-only mode (block AI training)", () => {
  it("08. toggle on → AI training checkbox disabled + visually unchecked → PATCH ships ai_training.enabled=false regardless of prior checkbox state", async () => {
    mockProfileFetch();
    render(<Wrapper><Step4Categorize /></Wrapper>);

    const aiTrainingBox = await screen.findByLabelText<HTMLInputElement>("AI training");
    const blockToggle = await screen.findByLabelText<HTMLInputElement>(
      /Switch to retrieval-only mode/i,
    );

    // Start: AI training is checked + interactive, blockMode off
    expect(aiTrainingBox.checked).toBe(true);
    expect(aiTrainingBox.disabled).toBe(false);
    expect(blockToggle.checked).toBe(false);

    // Engage retrieval-only mode
    fireEvent.click(blockToggle);

    // AI training checkbox should now render disabled + visually unchecked
    expect(aiTrainingBox.disabled).toBe(true);
    expect(aiTrainingBox.checked).toBe(false);

    // Submit: PATCH must ship ai_training.enabled=false even though
    // the underlying aiTrainingChecked local state was true (toggle wins)
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledTimes(1);
    });
    const payload = mockPatch.mock.calls[0][0];
    expect(payload.pricing_rules.license_types.ai_training.enabled).toBe(false);
  });
});

describe("Step4Categorize — Continue submit", () => {
  it("09. Continue PATCHes correct payload shape (canonical archive.price_annual; category; per-article prices; license_types) AND fires wizard.advance({})", async () => {
    const advance = vi.fn().mockResolvedValue({});
    mockHookReturn.mockReturnValue(defaultWizardState({ advance }));
    mockProfileFetch();

    render(<Wrapper><Step4Categorize /></Wrapper>);

    // Fill in form
    const select = await screen.findByRole<HTMLSelectElement>("combobox", { name: /primary domain/i });
    fireEvent.change(select, { target: { value: "Geopolitics" } });
    fireEvent.change(
      screen.getByLabelText<HTMLInputElement>(/Annual catalog license/i),
      { target: { value: "60000" } },
    );
    fireEvent.change(
      screen.getByLabelText<HTMLInputElement>(/Per-article AI training/i),
      { target: { value: "75" } },
    );
    fireEvent.change(
      screen.getByLabelText<HTMLInputElement>(/Per-article human research/i),
      { target: { value: "12.50" } },
    );

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    const payload = mockPatch.mock.calls[0][0];

    // Category writes to publishers.category
    expect(payload.category).toBe("Geopolitics");
    // Per-article prices write to top-level numeric fields
    expect(payload.default_ai_price).toBe(75);
    expect(payload.default_human_price).toBe(12.5);
    // CRITICAL: annual catalog price writes to canonical
    // pricing_rules.license_types.archive.price_annual (NOT legacy
    // top-level publishers.ai_annual_price). create-checkout reads
    // from this canonical field for archive license purchases.
    expect(payload.pricing_rules.license_types.archive.price_annual).toBe(60000);
    // License types default-checked
    expect(payload.pricing_rules.license_types.ai_training.enabled).toBe(true);
    expect(payload.pricing_rules.license_types.ai_retrieval.enabled).toBe(true);
    expect(payload.pricing_rules.license_types.human.enabled).toBe(true);

    // Wizard advance fires after PATCH succeeds
    await waitFor(() => expect(advance).toHaveBeenCalledWith({}));
  });
});

describe("Step4Categorize — KNOWN_ISSUES #18 cleanup proof (negative)", () => {
  it("10. PATCH payload does NOT contain ai_license_types (deprecated shim)", async () => {
    mockProfileFetch();
    render(<Wrapper><Step4Categorize /></Wrapper>);
    await screen.findByRole("combobox", { name: /primary domain/i });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    const payload = mockPatch.mock.calls[0][0];

    // KNOWN_ISSUES #18 cleanup gate: Step 4 v1 must NOT write the
    // deprecated ai_license_types field. Frontend writer count drops
    // to 0 once Step 4 ships + legacy Setup.tsx is unreachable
    // (Phase 3 Session 3.1 redirect already in place; Session 3.7
    // file deletion is the final close).
    expect(payload).not.toHaveProperty("ai_license_types");
    // Also assert nothing nested under pricing_rules carries the
    // legacy shim by mistake.
    expect(payload.pricing_rules).not.toHaveProperty("ai_license_types");
  });
});
