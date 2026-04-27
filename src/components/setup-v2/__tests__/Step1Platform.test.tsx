import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

import type { UseWizardStateResult } from "@/hooks/useWizardState";
import type { WizardStep } from "@/lib/api";

const mockHookReturn = vi.fn<() => UseWizardStateResult>();
vi.mock("@/hooks/useWizardState", () => ({
  useWizardState: () => mockHookReturn(),
}));

import { Step1Platform } from "../Step1Platform";

function defaultState(
  overrides: Partial<UseWizardStateResult> = {},
): UseWizardStateResult {
  return {
    state: null,
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

function Wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Step1Platform", () => {
  it("renders all 5 platform cards with v2 spec copy", () => {
    mockHookReturn.mockReturnValue(defaultState());
    render(<Wrapper><Step1Platform /></Wrapper>);

    expect(screen.getByRole("heading", { name: /Where do you publish/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Select Substack/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Select Beehiiv/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Select Ghost/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Select WordPress/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Select Custom or Other/i })).toBeTruthy();
    // Sample of v2 spec copy: each card shows setup-time + verification line
    expect(screen.getAllByText(/Setup time/i).length).toBe(5);
    expect(screen.getAllByText(/Verification/i).length).toBe(5);
  });

  it("from prospect, clicking a card calls wizard.advance({ platform })", async () => {
    const advance = vi.fn().mockResolvedValue({});
    mockHookReturn.mockReturnValue(
      defaultState({ setupState: "prospect", advance }),
    );
    render(<Wrapper><Step1Platform /></Wrapper>);

    fireEvent.click(screen.getByRole("button", { name: /Select Substack/i }));
    await waitFor(() => expect(advance).toHaveBeenCalledTimes(1));
    expect(advance).toHaveBeenCalledWith({ platform: "substack" });
  });

  it("from in_setup,1 with no platform, clicking a card calls saveStepData", async () => {
    const saveStepData = vi.fn().mockResolvedValue({});
    const advance = vi.fn().mockResolvedValue({});
    mockHookReturn.mockReturnValue(
      defaultState({
        setupState: "in_setup",
        currentStep: 1 as WizardStep,
        setupData: {},
        saveStepData,
        advance,
      }),
    );
    render(<Wrapper><Step1Platform /></Wrapper>);

    fireEvent.click(screen.getByRole("button", { name: /Select Beehiiv/i }));
    await waitFor(() => expect(saveStepData).toHaveBeenCalledTimes(1));
    expect(saveStepData).toHaveBeenCalledWith({ platform: "beehiiv" });
    expect(advance).not.toHaveBeenCalled();
  });

  it("from in_setup,1 with platform already selected, shows Continue button that advances", async () => {
    const advance = vi.fn().mockResolvedValue({});
    mockHookReturn.mockReturnValue(
      defaultState({
        setupState: "in_setup",
        currentStep: 1 as WizardStep,
        setupData: { platform: "ghost" },
        advance,
      }),
    );
    render(<Wrapper><Step1Platform /></Wrapper>);

    const continueBtn = screen.getByRole("button", { name: /Continue with Ghost/i });
    expect(continueBtn).toBeTruthy();

    fireEvent.click(continueBtn);
    await waitFor(() => expect(advance).toHaveBeenCalledTimes(1));
    expect(advance).toHaveBeenCalledWith({ platform: "ghost" });
  });

  it("from in_setup,1 with platform selected, clicking the same card again advances (Continue equivalent)", async () => {
    const advance = vi.fn().mockResolvedValue({});
    const saveStepData = vi.fn().mockResolvedValue({});
    mockHookReturn.mockReturnValue(
      defaultState({
        setupState: "in_setup",
        currentStep: 1 as WizardStep,
        setupData: { platform: "wordpress" },
        advance,
        saveStepData,
      }),
    );
    render(<Wrapper><Step1Platform /></Wrapper>);

    fireEvent.click(screen.getByRole("button", { name: /Select WordPress/i }));
    await waitFor(() => expect(advance).toHaveBeenCalledTimes(1));
    expect(advance).toHaveBeenCalledWith({ platform: "wordpress" });
    expect(saveStepData).not.toHaveBeenCalled();
  });
});
