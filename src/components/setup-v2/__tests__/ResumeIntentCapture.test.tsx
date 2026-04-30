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

  // ── Phase 4.6 (2026-04-30) — allowAdvance prop ────────────────────
  // Closes KI #53 (Step 3 dashboard dead-end). Skip-for-now CTA lets
  // publishers advance past placeholder steps that are deliberately
  // deferred. Step 3 Model Perception preview is the only v1 consumer.

  describe("allowAdvance prop", () => {
    it("does NOT render Skip for now button when allowAdvance is omitted (default false)", () => {
      mockHookReturn.mockReturnValue(defaultState());
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
        screen.queryByRole("button", { name: /Skip for now/i }),
      ).toBeNull();
    });

    it("does NOT render Skip for now button when allowAdvance={false}", () => {
      mockHookReturn.mockReturnValue(defaultState());
      render(
        <Wrapper>
          <ResumeIntentCapture
            stepLabel="step3-model-perception"
            title="Step 3"
            message="msg"
            allowAdvance={false}
          />
        </Wrapper>,
      );
      expect(
        screen.queryByRole("button", { name: /Skip for now/i }),
      ).toBeNull();
    });

    it("renders Skip for now button pre-submit when allowAdvance={true}", () => {
      mockHookReturn.mockReturnValue(defaultState());
      render(
        <Wrapper>
          <ResumeIntentCapture
            stepLabel="step3-model-perception"
            title="Step 3"
            message="msg"
            allowAdvance={true}
          />
        </Wrapper>,
      );
      expect(
        screen.getByRole("button", { name: /Skip for now/i }),
      ).toBeTruthy();
      // Email-capture form still present alongside the skip button
      expect(screen.getByPlaceholderText("you@yourpublication.com")).toBeTruthy();
    });

    it("renders Skip for now button post-submit (already-captured state) when allowAdvance={true}", () => {
      mockHookReturn.mockReturnValue(
        defaultState({
          setupData: {
            wizard_resume_intent: {
              "step3-model-perception": {
                email: "founder@example.com",
                captured_at: "2026-04-30T07:00:00Z",
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
            allowAdvance={true}
          />
        </Wrapper>,
      );
      expect(
        screen.getByRole("button", { name: /Skip for now/i }),
      ).toBeTruthy();
      // Confirmation state visible
      expect(
        screen.getByText(/We'll email you when this is ready/i),
      ).toBeTruthy();
    });

    it("calls wizard.advance({}) when Skip for now is clicked", async () => {
      const advance = vi.fn().mockResolvedValue({});
      mockHookReturn.mockReturnValue(defaultState({ advance }));
      render(
        <Wrapper>
          <ResumeIntentCapture
            stepLabel="step3-model-perception"
            title="Step 3"
            message="msg"
            allowAdvance={true}
          />
        </Wrapper>,
      );
      fireEvent.click(screen.getByRole("button", { name: /Skip for now/i }));
      await waitFor(() => {
        expect(advance).toHaveBeenCalledTimes(1);
      });
      expect(advance).toHaveBeenCalledWith({});
    });

    it("surfaces inline error when wizard.advance throws on Skip", async () => {
      const advance = vi
        .fn()
        .mockRejectedValue(new Error("Network unreachable"));
      mockHookReturn.mockReturnValue(defaultState({ advance }));
      render(
        <Wrapper>
          <ResumeIntentCapture
            stepLabel="step3-model-perception"
            title="Step 3"
            message="msg"
            allowAdvance={true}
          />
        </Wrapper>,
      );
      fireEvent.click(screen.getByRole("button", { name: /Skip for now/i }));
      await waitFor(() => {
        expect(advance).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(screen.getByText(/Network unreachable/i)).toBeTruthy();
      });
    });
  });
});
