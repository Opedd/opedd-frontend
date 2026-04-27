import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

import type { UseWizardStateResult } from "@/hooks/useWizardState";

const mockHookReturn = vi.fn<() => UseWizardStateResult>();
vi.mock("@/hooks/useWizardState", () => ({
  useWizardState: () => mockHookReturn(),
}));

import { Step2Stub } from "../Step2Stub";

function defaultState(): UseWizardStateResult {
  return {
    state: null,
    setupState: "in_setup",
    currentStep: 2,
    setupData: {},
    dormant: false,
    canAdvance: false,
    canRegress: false,
    nextStep: null,
    prevStep: null,
    isLoading: false,
    isFetching: false,
    isMutating: false,
    isOffline: false,
    error: null,
    advance: vi.fn(),
    regress: vi.fn(),
    saveStepData: vi.fn().mockResolvedValue({}),
    refetch: vi.fn(),
  };
}

function Wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHookReturn.mockReturnValue(defaultState());
});

describe("Step2Stub — platform-specific stub copy", () => {
  it("renders Substack-specific copy when platform=substack", () => {
    render(<Wrapper><Step2Stub platform="substack" /></Wrapper>);
    expect(screen.getByText(/Connecting your Substack/i)).toBeTruthy();
    expect(screen.getByText(/rebuilding the Substack onboarding flow/i)).toBeTruthy();
  });

  it("renders Beehiiv-specific copy when platform=beehiiv", () => {
    render(<Wrapper><Step2Stub platform="beehiiv" /></Wrapper>);
    expect(screen.getByText(/Connecting your Beehiiv/i)).toBeTruthy();
    expect(screen.getByText(/Beehiiv onboarding is coming next/i)).toBeTruthy();
  });

  it("renders Ghost-specific copy when platform=ghost", () => {
    render(<Wrapper><Step2Stub platform="ghost" /></Wrapper>);
    expect(screen.getByText(/Connecting your Ghost site/i)).toBeTruthy();
  });

  it("renders WordPress-specific copy when platform=wordpress", () => {
    render(<Wrapper><Step2Stub platform="wordpress" /></Wrapper>);
    expect(screen.getByText(/Connecting your WordPress site/i)).toBeTruthy();
    expect(screen.getByText(/Application Password/i)).toBeTruthy();
  });

  it("renders Custom-specific copy when platform=custom", () => {
    render(<Wrapper><Step2Stub platform="custom" /></Wrapper>);
    expect(screen.getByText(/Connecting your custom site/i)).toBeTruthy();
  });

  it("renders fallback copy when platform is null", () => {
    render(<Wrapper><Step2Stub platform={null} /></Wrapper>);
    expect(screen.getByText(/Connecting your platform/i)).toBeTruthy();
  });

  it("includes the email-capture form (delegates to ResumeIntentCapture)", () => {
    render(<Wrapper><Step2Stub platform="substack" /></Wrapper>);
    expect(screen.getByPlaceholderText("you@yourpublication.com")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Email me when ready/i }),
    ).toBeTruthy();
  });
});
