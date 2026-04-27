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

  it("renders Step2Stub with platform-specific copy for in_setup,2 + platform=substack", () => {
    mockHookReturn.mockReturnValue(
      defaultState({
        setupState: "in_setup",
        currentStep: 2 as WizardStep,
        setupData: { platform: "substack" },
      }),
    );
    render(<Wrapper><SetupV2 /></Wrapper>);
    expect(screen.getByText(/Connecting your Substack/i)).toBeTruthy();
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
    expect(screen.getByText(/Review pending/i)).toBeTruthy();
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

  it("renders add-source stub for /setup-v2?add=1 when not in prospect", () => {
    mockHookReturn.mockReturnValue(
      defaultState({ setupState: "connected", currentStep: 5 as WizardStep }),
    );
    render(
      <Wrapper initialEntry="/setup-v2?add=1"><SetupV2 /></Wrapper>,
    );
    expect(screen.getByRole("heading", { name: /Adding additional sources/i })).toBeTruthy();
    expect(screen.getByText(/Phase 4/i)).toBeTruthy();
  });

  it("ignores ?add=1 for prospect users (renders normal Step 1 picker)", () => {
    mockHookReturn.mockReturnValue(defaultState({ setupState: "prospect" }));
    render(
      <Wrapper initialEntry="/setup-v2?add=1"><SetupV2 /></Wrapper>,
    );
    expect(screen.getByRole("heading", { name: /Where do you publish/i })).toBeTruthy();
  });
});
