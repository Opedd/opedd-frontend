import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import type { UseWizardStateResult } from "@/hooks/useWizardState";
import type { WizardStep } from "@/lib/api";
import { WizardStateError } from "@/lib/api";

const mockHookReturn = vi.fn<() => UseWizardStateResult>();
vi.mock("@/hooks/useWizardState", () => ({
  useWizardState: () => mockHookReturn(),
}));

// Phase 3 Session 3.3 — SetupV2 now routes platform=substack to
// Step2Substack (functional). Stub it out for routing-shape tests so
// this file doesn't pull in its useAuth + verify-ownership wiring.
// Step2Substack's own tests cover its internals.
vi.mock("@/components/setup-v2/Step2Substack", () => ({
  Step2Substack: () => <div data-testid="step2-substack-marker" />,
}));

import SetupV2 from "@/pages/SetupV2";

function defaultState(
  overrides: Partial<UseWizardStateResult> = {},
): UseWizardStateResult {
  return {
    state: { publisher_id: "p1", setup_state: "prospect", setup_step: 1, setup_data: {} } as never,
    setupState: "prospect",
    currentStep: 1 as WizardStep,
    setupData: {},
    dormant: false,
    canAdvance: true,
    canRegress: false,
    nextStep: 1 as WizardStep,
    prevStep: null,
    isLoading: false,
    isFetching: false,
    isMutating: false,
    isOffline: false,
    error: null,
    advance: vi.fn().mockResolvedValue({}),
    regress: vi.fn(),
    saveStepData: vi.fn().mockResolvedValue({}),
    refetch: vi.fn(),
    ...overrides,
  };
}

function DashboardMarker() {
  const location = useLocation();
  return (
    <div data-testid="dashboard-marker">
      <span data-testid="dashboard-search">{location.search}</span>
    </div>
  );
}

function Wrapper({
  children,
  initialEntry = "/setup-v2",
}: {
  children: ReactNode;
  initialEntry?: string;
}) {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/setup-v2" element={children} />
        <Route path="/dashboard" element={<DashboardMarker />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SetupV2 — state-driven step routing", () => {
  it("renders FullPageSpinner when isLoading and no state yet", () => {
    mockHookReturn.mockReturnValue(
      defaultState({ isLoading: true, state: null }),
    );
    const { container } = render(<Wrapper><SetupV2 /></Wrapper>);
    // Spinner has no text; render produces a div with the spinner SVG
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders error view when wizard.error is set and no state", () => {
    mockHookReturn.mockReturnValue(
      defaultState({
        state: null,
        error: new WizardStateError("Boom", "INTERNAL_ERROR", 500),
      }),
    );
    render(<Wrapper><SetupV2 /></Wrapper>);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/Boom/)).toBeTruthy();
  });

  it("renders Step1Platform for setup_state='prospect'", () => {
    mockHookReturn.mockReturnValue(defaultState({ setupState: "prospect" }));
    render(<Wrapper><SetupV2 /></Wrapper>);
    expect(screen.getByRole("heading", { name: /Where do you publish/i })).toBeTruthy();
  });

  it("renders Step1Platform for in_setup,1", () => {
    mockHookReturn.mockReturnValue(
      defaultState({ setupState: "in_setup", currentStep: 1 as WizardStep }),
    );
    render(<Wrapper><SetupV2 /></Wrapper>);
    expect(screen.getByRole("heading", { name: /Where do you publish/i })).toBeTruthy();
  });

  it("renders Step2Substack (functional) for in_setup,2 + platform=substack", () => {
    mockHookReturn.mockReturnValue(
      defaultState({
        setupState: "in_setup",
        currentStep: 2 as WizardStep,
        setupData: { platform: "substack" },
      }),
    );
    render(<Wrapper><SetupV2 /></Wrapper>);
    expect(screen.getByTestId("step2-substack-marker")).toBeTruthy();
  });

  it("renders Step2Stub for in_setup,2 + non-substack platform (e.g., beehiiv)", () => {
    mockHookReturn.mockReturnValue(
      defaultState({
        setupState: "in_setup",
        currentStep: 2 as WizardStep,
        setupData: { platform: "beehiiv" },
      }),
    );
    render(<Wrapper><SetupV2 /></Wrapper>);
    expect(screen.getByText(/Connecting your Beehiiv/i)).toBeTruthy();
  });

  it("renders Step3 stub for in_setup,3", () => {
    mockHookReturn.mockReturnValue(
      defaultState({
        setupState: "in_setup",
        currentStep: 3 as WizardStep,
        setupData: { platform: "substack" },
      }),
    );
    render(<Wrapper><SetupV2 /></Wrapper>);
    expect(screen.getByRole("heading", { name: /Model Perception preview/i })).toBeTruthy();
  });

  it("renders TerminalState 'connected' for setup_state='connected'", () => {
    mockHookReturn.mockReturnValue(
      defaultState({ setupState: "connected", currentStep: 5 as WizardStep }),
    );
    render(<Wrapper><SetupV2 /></Wrapper>);
    expect(screen.getByRole("heading", { name: /Your setup is complete/i })).toBeTruthy();
    // Phase 4.7.4 (OQ.2): "Review pending" copy removed; the heading + Go to
    // dashboard CTA are the only TerminalState content for connected state.
    expect(screen.queryByText(/Review pending/i)).toBeNull();
    expect(screen.getByRole("link", { name: /Go to dashboard/i })).toBeTruthy();
  });

  it("renders TerminalState 'suspended' for setup_state='suspended'", () => {
    mockHookReturn.mockReturnValue(
      defaultState({ setupState: "suspended", currentStep: 1 as WizardStep }),
    );
    render(<Wrapper><SetupV2 /></Wrapper>);
    expect(screen.getByRole("heading", { name: /Account suspended/i })).toBeTruthy();
  });

  it("redirects to /dashboard for setup_state='verified'", async () => {
    mockHookReturn.mockReturnValue(
      defaultState({ setupState: "verified", currentStep: 5 as WizardStep }),
    );
    render(<Wrapper><SetupV2 /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-marker")).toBeTruthy();
    });
  });

  // ?add=1 branch tests removed Phase 4.7.2 — branch decommissioned per OQ.3
  // (no add-source flow in v1). URLs with ?add=1 now fall through to the
  // regular state-driven dispatch silently.
});
