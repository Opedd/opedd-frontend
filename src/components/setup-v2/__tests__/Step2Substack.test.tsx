import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@sentry/react", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

import type { UseWizardStateResult } from "@/hooks/useWizardState";
import type { WizardStep } from "@/lib/api";

// Mock useAuth — Step2Substack needs getAccessToken
const mockGetAccessToken = vi.fn(async () => "test-jwt");
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ getAccessToken: mockGetAccessToken, user: { id: "u1" } }),
}));

// Mock useWizardState — controlled per-test via mockHookReturn
const mockHookReturn = vi.fn<() => UseWizardStateResult>();
vi.mock("@/hooks/useWizardState", () => ({
  useWizardState: () => mockHookReturn(),
}));

// Mock api: verifyOwnershipApi (typed) + edgeFetch (catches the inline
// import-substack-rss / extract-branding / publisher-profile calls).
const mockGet = vi.fn();
const mockSendCode = vi.fn();
const mockConfirmCode = vi.fn();
const mockEdgeFetch = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    verifyOwnershipApi: {
      get: (...args: unknown[]) => mockGet(...args),
      sendCode: (...args: unknown[]) => mockSendCode(...args),
      confirmCode: (...args: unknown[]) => mockConfirmCode(...args),
    },
    edgeFetch: (...args: unknown[]) => mockEdgeFetch(...args),
  };
});

import { Step2Substack } from "../Step2Substack";

function defaultWizardState(
  overrides: Partial<UseWizardStateResult> = {},
): UseWizardStateResult {
  const advance = vi.fn().mockResolvedValue({});
  const saveStepData = vi.fn().mockResolvedValue({});
  return {
    state: {
      publisher_id: "p1",
      setup_state: "in_setup",
      setup_step: 2,
      setup_data: { platform: "substack" },
    } as never,
    setupState: "in_setup",
    currentStep: 2 as WizardStep,
    setupData: { platform: "substack" },
    dormant: false,
    canAdvance: true,
    canRegress: true,
    nextStep: 3 as WizardStep,
    prevStep: 1 as WizardStep,
    isLoading: false,
    isFetching: false,
    isMutating: false,
    isOffline: false,
    error: null,
    advance,
    regress: vi.fn(),
    saveStepData,
    refetch: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default GET → no challenge, not verified
  mockGet.mockResolvedValue({ ownership_verification: null, is_verified: false });
  mockHookReturn.mockReturnValue(defaultWizardState());
});

/**
 * Wait until the loading spinner is gone. Step2Substack mounts in a
 * loading state while it fires verify-ownership GET; tests assert
 * post-load behavior unless they specifically exercise loading.
 */
async function renderAndSettle(): Promise<ReturnType<typeof render>> {
  const utils = render(<Step2Substack />);
  await waitFor(() => {
    expect(mockGet).toHaveBeenCalled();
  });
  return utils;
}

describe("Step2Substack — happy path", () => {
  it("URL submit fires verify-ownership send_code and renders OTP screen with masked email", async () => {
    mockSendCode.mockResolvedValue({
      verified: false,
      method: "email_to_publication",
      reason: "code_sent",
      awaiting_confirmation: true,
      code_sent_to: "o***@substack.com",
      expires_in_seconds: 900,
    });

    await renderAndSettle();

    fireEvent.change(screen.getByLabelText("Substack URL"), {
      target: { value: "https://opedd.substack.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(mockSendCode).toHaveBeenCalledWith(
        "https://opedd.substack.com",
        "test-jwt",
      );
    });

    // OTP screen is rendered with the masked email inline
    expect(
      await screen.findByText(/One trip to Substack/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/o\*\*\*@substack\.com/).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByLabelText("Verification code")).toBeInTheDocument();
  });

  it("OTP submit triggers parallel ingest + branding + consent and advances wizard", async () => {
    const advance = vi.fn().mockResolvedValue({});
    mockHookReturn.mockReturnValue(
      defaultWizardState({
        advance,
        setupData: {
          platform: "substack",
          substack_url: "https://opedd.substack.com",
        },
      }),
    );
    // Active challenge already present on GET — skip URL step
    mockGet.mockResolvedValue({
      ownership_verification: {
        method: "email_to_publication",
        status: "pending",
        challenge: {
          contact_email: "owner@substack.com",
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          attempt_count: 0,
        },
      },
      is_verified: false,
    });
    mockConfirmCode.mockResolvedValue({
      verified: true,
      method: "email_to_publication",
      evidence: { contact_email_masked: "o***@substack.com" },
    });
    mockEdgeFetch.mockResolvedValue({});

    await renderAndSettle();

    // Wait for OTP screen to render from GET-derived state
    await screen.findByLabelText("Verification code");
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify code/i }));

    await waitFor(() => {
      expect(mockConfirmCode).toHaveBeenCalledWith("123456", "test-jwt");
    });

    // Parallel calls: import-substack-rss + extract-branding + consent
    await waitFor(() => {
      expect(mockEdgeFetch).toHaveBeenCalledTimes(3);
    });
    const calledUrls = mockEdgeFetch.mock.calls.map((c) => c[0]);
    expect(calledUrls).toContain("https://api.opedd.com/import-substack-rss");
    expect(calledUrls).toContain("https://api.opedd.com/extract-branding");
    expect(calledUrls).toContain("https://api.opedd.com/publisher-profile");

    await waitFor(() => {
      expect(advance).toHaveBeenCalledWith({});
    });
  });

  it("resume path: is_verified=true on mount renders Continue button (no auto-advance)", async () => {
    const advance = vi.fn().mockResolvedValue({});
    mockHookReturn.mockReturnValue(
      defaultWizardState({
        advance,
        setupData: {
          platform: "substack",
          substack_url: "https://opedd.substack.com",
        },
      }),
    );
    mockGet.mockResolvedValue({
      ownership_verification: {
        method: "email_to_publication",
        status: "verified",
        verified_at: new Date().toISOString(),
      },
      is_verified: true,
    });
    mockEdgeFetch.mockResolvedValue({});

    await renderAndSettle();

    expect(
      await screen.findByText(/Your Substack is verified/i),
    ).toBeInTheDocument();
    // No advance until user clicks
    expect(advance).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^Continue/i }));

    await waitFor(() => {
      expect(advance).toHaveBeenCalledWith({});
    });
  });
});

describe("Step2Substack — input validation", () => {
  it("empty URL submission shows inline error and does not call sendCode", async () => {
    await renderAndSettle();

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(
      await screen.findByText(/Please enter your Substack URL/i),
    ).toBeInTheDocument();
    expect(mockSendCode).not.toHaveBeenCalled();
  });

  it("OTP code with non-6-digit input shows inline error and does not call confirmCode", async () => {
    mockGet.mockResolvedValue({
      ownership_verification: {
        method: "email_to_publication",
        status: "pending",
        challenge: {
          contact_email: "owner@substack.com",
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          attempt_count: 0,
        },
      },
      is_verified: false,
    });

    await renderAndSettle();

    await screen.findByLabelText("Verification code");
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "12345" }, // 5 digits, not 6
    });
    // Submit button is disabled while length !== 6 — assert disabled.
    expect(screen.getByRole("button", { name: /Verify code/i })).toBeDisabled();
    expect(mockConfirmCode).not.toHaveBeenCalled();
  });
});

describe("Step2Substack — backend error states", () => {
  it("send_code returns no_contact_email_found → renders fallback messaging", async () => {
    mockSendCode.mockResolvedValue({
      verified: false,
      method: "email_to_publication",
      reason: "no_contact_email_found",
      fallback_available: "dns_txt_record",
    });

    await renderAndSettle();

    fireEvent.change(screen.getByLabelText("Substack URL"), {
      target: { value: "https://opedd.substack.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(
      await screen.findByText(/We couldn't find a contact email/i),
    ).toBeInTheDocument();
    // No OTP input — we're on the fallback screen
    expect(screen.queryByLabelText("Verification code")).not.toBeInTheDocument();
  });

  it("confirm_code returns code_mismatch → keeps OTP input and surfaces error", async () => {
    mockGet.mockResolvedValue({
      ownership_verification: {
        method: "email_to_publication",
        status: "pending",
        challenge: {
          contact_email: "owner@substack.com",
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          attempt_count: 0,
        },
      },
      is_verified: false,
    });
    mockConfirmCode.mockResolvedValue({
      verified: false,
      method: "email_to_publication",
      reason: "code_mismatch",
    });

    await renderAndSettle();

    fireEvent.change(await screen.findByLabelText("Verification code"), {
      target: { value: "111111" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify code/i }));

    expect(
      await screen.findByText(/Wrong code — please try again/i),
    ).toBeInTheDocument();
    // OTP screen still rendered
    expect(screen.getByLabelText("Verification code")).toBeInTheDocument();
  });

  it("confirm_code returns CHALLENGE_EXPIRED → returns to URL entry with expired notice", async () => {
    mockGet.mockResolvedValue({
      ownership_verification: {
        method: "email_to_publication",
        status: "pending",
        challenge: {
          contact_email: "owner@substack.com",
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          attempt_count: 0,
        },
      },
      is_verified: false,
    });
    mockConfirmCode.mockRejectedValue(
      new Error("Verification code has expired"),
    );

    await renderAndSettle();

    fireEvent.change(await screen.findByLabelText("Verification code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify code/i }));

    // Falls back to URL entry with soft notice
    expect(
      await screen.findByText(/Your code expired/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Substack URL")).toBeInTheDocument();
  });

  it("confirm_code returns TOO_MANY_ATTEMPTS → returns to URL entry with retry notice", async () => {
    mockGet.mockResolvedValue({
      ownership_verification: {
        method: "email_to_publication",
        status: "pending",
        challenge: {
          contact_email: "owner@substack.com",
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          attempt_count: 4,
        },
      },
      is_verified: false,
    });
    mockConfirmCode.mockRejectedValue(
      new Error("Too many wrong codes — request a new one"),
    );

    await renderAndSettle();

    fireEvent.change(await screen.findByLabelText("Verification code"), {
      target: { value: "999999" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify code/i }));

    expect(
      await screen.findByText(/Too many wrong codes/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Substack URL")).toBeInTheDocument();
  });
});

describe("Step2Substack — non-blocking finalize failures", () => {
  it("import-substack-rss failure still advances wizard with warning", async () => {
    const advance = vi.fn().mockResolvedValue({});
    mockHookReturn.mockReturnValue(
      defaultWizardState({
        advance,
        setupData: {
          platform: "substack",
          substack_url: "https://opedd.substack.com",
        },
      }),
    );
    mockGet.mockResolvedValue({
      ownership_verification: {
        method: "email_to_publication",
        status: "pending",
        challenge: {
          contact_email: "owner@substack.com",
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          attempt_count: 0,
        },
      },
      is_verified: false,
    });
    mockConfirmCode.mockResolvedValue({
      verified: true,
      method: "email_to_publication",
      evidence: { contact_email_masked: "o***@substack.com" },
    });
    // Per-call dispatch by URL: import fails; branding + consent succeed
    mockEdgeFetch.mockImplementation(async (url: string) => {
      if (url.includes("import-substack-rss")) {
        throw new Error("Substack rate-limited us");
      }
      return {};
    });

    await renderAndSettle();
    fireEvent.change(await screen.findByLabelText("Verification code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify code/i }));

    // Wizard still advanced despite RSS failure
    await waitFor(() => {
      expect(advance).toHaveBeenCalledWith({});
    });
  });

  it("extract-branding failure does NOT block advance and surfaces no error", async () => {
    const advance = vi.fn().mockResolvedValue({});
    mockHookReturn.mockReturnValue(
      defaultWizardState({
        advance,
        setupData: {
          platform: "substack",
          substack_url: "https://opedd.substack.com",
        },
      }),
    );
    mockGet.mockResolvedValue({
      ownership_verification: {
        method: "email_to_publication",
        status: "pending",
        challenge: {
          contact_email: "owner@substack.com",
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          attempt_count: 0,
        },
      },
      is_verified: false,
    });
    mockConfirmCode.mockResolvedValue({
      verified: true,
      method: "email_to_publication",
      evidence: { contact_email_masked: "o***@substack.com" },
    });
    mockEdgeFetch.mockImplementation(async (url: string) => {
      if (url.includes("extract-branding")) {
        throw new Error("Branding scrape timed out");
      }
      return {};
    });

    await renderAndSettle();
    fireEvent.change(await screen.findByLabelText("Verification code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify code/i }));

    await waitFor(() => {
      expect(advance).toHaveBeenCalledWith({});
    });
    // No error toast about branding
    expect(
      screen.queryByText(/Branding scrape timed out/i),
    ).not.toBeInTheDocument();
  });
});

describe("Step2Substack — state mismatch", () => {
  it("wizard.advance STATE_MISMATCH after verification surfaces an error message", async () => {
    const advance = vi
      .fn()
      .mockRejectedValue(new Error("Wizard state changed — please reload"));
    mockHookReturn.mockReturnValue(
      defaultWizardState({
        advance,
        setupData: {
          platform: "substack",
          substack_url: "https://opedd.substack.com",
        },
      }),
    );
    mockGet.mockResolvedValue({
      ownership_verification: {
        method: "email_to_publication",
        status: "pending",
        challenge: {
          contact_email: "owner@substack.com",
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          attempt_count: 0,
        },
      },
      is_verified: false,
    });
    mockConfirmCode.mockResolvedValue({
      verified: true,
      method: "email_to_publication",
      evidence: { contact_email_masked: "o***@substack.com" },
    });
    mockEdgeFetch.mockResolvedValue({});

    await renderAndSettle();
    fireEvent.change(await screen.findByLabelText("Verification code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify code/i }));

    expect(
      await screen.findByText(/Wizard state changed/i),
    ).toBeInTheDocument();
  });
});
