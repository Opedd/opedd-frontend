import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

import type { UseWizardStateResult } from "@/hooks/useWizardState";

const mockHookReturn = vi.fn<() => UseWizardStateResult>();
vi.mock("@/hooks/useWizardState", () => ({
  useWizardState: () => mockHookReturn(),
}));

import { ResumeIntentCapture } from "../ResumeIntentCapture";

function defaultState(
  overrides: Partial<UseWizardStateResult> = {},
): UseWizardStateResult {
  return {
    state: null,
    setupState: "in_setup",
    currentStep: 3,
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
    saveStepData: vi.fn(),
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

describe("ResumeIntentCapture", () => {
  it("renders title + message + email input + submit button", () => {
    mockHookReturn.mockReturnValue(defaultState());
    render(
      <Wrapper>
        <ResumeIntentCapture
          stepLabel="step3-model-perception"
          title="Model Perception preview"
          message="Coming soon — your archive is being indexed."
        />
      </Wrapper>,
    );
    expect(screen.getByText("Model Perception preview")).toBeTruthy();
    expect(
      screen.getByText("Coming soon — your archive is being indexed."),
    ).toBeTruthy();
    expect(screen.getByPlaceholderText("you@yourpublication.com")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Email me when ready/i }),
    ).toBeTruthy();
  });

  it("calls saveStepData with namespaced merge that preserves prior entries", async () => {
    const saveStepData = vi.fn().mockResolvedValue({});
    mockHookReturn.mockReturnValue(
      defaultState({
        saveStepData,
        setupData: {
          platform: "substack",
          wizard_resume_intent: {
            "step4-categorize-price": {
              email: "older@example.com",
              captured_at: "2026-04-26T12:00:00Z",
            },
          },
        },
      }),
    );

    render(
      <Wrapper>
        <ResumeIntentCapture
          stepLabel="step3-model-perception"
          title="Step 3"
          message="msg"
        />
      </Wrapper>,
    );

    fireEvent.change(screen.getByPlaceholderText("you@yourpublication.com"), {
      target: { value: "newer@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Email me when ready/i }),
    );

    await waitFor(() => {
      expect(saveStepData).toHaveBeenCalledTimes(1);
    });

    const arg = saveStepData.mock.calls[0][0];
    expect(arg.wizard_resume_intent).toBeDefined();
    // Prior entry preserved (no clobber)
    expect(arg.wizard_resume_intent["step4-categorize-price"].email).toBe(
      "older@example.com",
    );
    // New entry added with normalized email + iso timestamp
    expect(arg.wizard_resume_intent["step3-model-perception"].email).toBe(
      "newer@example.com",
    );
    expect(
      typeof arg.wizard_resume_intent["step3-model-perception"].captured_at,
    ).toBe("string");
    // Confirmation state surfaced after submit
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeTruthy();
    });
  });

  it("blocks submit on invalid email and surfaces validation message", async () => {
    const saveStepData = vi.fn();
    mockHookReturn.mockReturnValue(defaultState({ saveStepData }));
    render(
      <Wrapper>
        <ResumeIntentCapture
          stepLabel="step3-model-perception"
          title="Step 3"
          message="msg"
        />
      </Wrapper>,
    );
    const input = screen.getByPlaceholderText("you@yourpublication.com");
    fireEvent.change(input, { target: { value: "not-an-email" } });
    fireEvent.blur(input);
    fireEvent.click(
      screen.getByRole("button", { name: /Email me when ready/i }),
    );
    expect(saveStepData).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter a valid email address/i)).toBeTruthy();
  });

  it("renders the already-captured confirmation when an entry exists for this stepLabel", () => {
    mockHookReturn.mockReturnValue(
      defaultState({
        setupData: {
          wizard_resume_intent: {
            "step3-model-perception": {
              email: "founder@example.com",
              captured_at: "2026-04-27T10:00:00Z",
            },
          },
        },
      }),
    );
    render(
      <Wrapper>
        <ResumeIntentCapture
          stepLabel="step3-model-perception"
          title="Step 3"
          message="msg"
        />
      </Wrapper>,
    );
    expect(
      screen.getByText(/We'll email you when this is ready/i),
    ).toBeTruthy();
    expect(screen.getByText(/founder@example.com/)).toBeTruthy();
    // Form not rendered
    expect(
      screen.queryByPlaceholderText("you@yourpublication.com"),
    ).toBeNull();
  });
});
