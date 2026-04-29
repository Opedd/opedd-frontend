import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

// Mock api wrappers + the inline edgeFetch calls (publisher-profile GET on
// mount; import-substack-rss + extract-branding in finalize).
const mockGet = vi.fn();
const mockIssueVisibleTextToken = vi.fn();
const mockVerifyVisibleTextToken = vi.fn();
const mockIssueDnsTxtToken = vi.fn();
const mockCheckDnsTxtToken = vi.fn();
const mockEdgeFetch = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    verifyOwnershipApi: {
      get: (...args: unknown[]) => mockGet(...args),
      issueVisibleTextToken: (...args: unknown[]) =>
        mockIssueVisibleTextToken(...args),
      verifyVisibleTextToken: (...args: unknown[]) =>
        mockVerifyVisibleTextToken(...args),
      issueDnsTxtToken: (...args: unknown[]) => mockIssueDnsTxtToken(...args),
      checkDnsTxtToken: (...args: unknown[]) => mockCheckDnsTxtToken(...args),
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

// Capture original clipboard descriptor (if any) so afterEach can restore.
// Same cleanup pattern as TokenDisplay.test.tsx — prevents this test file's
// jsdom mutation from leaking into other test files sharing the worker.
const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard",
);

beforeEach(() => {
  vi.clearAllMocks();
  // Default GETs: ownership = null/not-verified; publisher-profile = inbound_email present
  mockGet.mockResolvedValue({ ownership_verification: null, is_verified: false });
  mockEdgeFetch.mockImplementation((url: string) => {
    if (url.includes("/publisher-profile")) {
      return Promise.resolve({
        inbound_email: "opedd+abc12345d678@inbound.opedd.com",
        verification_status: "pending",
      });
    }
    if (url.includes("/import-substack-rss")) {
      return Promise.resolve({ imported: 25, total: 25 });
    }
    if (url.includes("/extract-branding")) {
      return Promise.resolve({ logo_url: "x" });
    }
    return Promise.reject(new Error("unexpected edgeFetch url: " + url));
  });
  mockHookReturn.mockReturnValue(defaultWizardState());

  // jsdom doesn't ship Clipboard API; mock for TokenDisplay.
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  // Restore original clipboard descriptor (or delete property if jsdom
  // didn't ship one). Prevents leaks into sibling test files.
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
  } else {
    // @ts-expect-error — intentional cleanup of mocked property
    delete (navigator as unknown as { clipboard?: unknown }).clipboard;
  }
});

async function renderAndSettle() {
  const utils = render(<Step2Substack />);
  await waitFor(() => {
    expect(mockGet).toHaveBeenCalled();
  });
  return utils;
}

// ─── URL Entry → Active flow ─────────────────────────────────────────

describe("Step2Substack — URL entry to active flow", () => {
  it("mount renders URL entry by default (no challenge, not verified)", async () => {
    await renderAndSettle();
    await waitFor(() => {
      expect(screen.getByTestId("step2-url-input")).toBeInTheDocument();
    });
    expect(screen.getByTestId("step2-url-submit")).toBeInTheDocument();
  });

  it("URL submit fires issueVisibleTextToken and transitions to active mode", async () => {
    mockIssueVisibleTextToken.mockResolvedValue({
      verified: false,
      method: "visible_text_token",
      awaiting_confirmation: true,
      reason: "token_issued",
      expires_in_seconds: 86400,
      instructions: {
        record_type: "visible_text",
        name: "https://opedd.substack.com/about",
        value: "opedd-verify-A8F9C2BX",
        ttl: 86400,
      },
    });

    await renderAndSettle();
    fireEvent.change(screen.getByTestId("step2-url-input"), {
      target: { value: "opedd.substack.com" },
    });
    fireEvent.click(screen.getByTestId("step2-url-submit"));

    await waitFor(() => {
      expect(mockIssueVisibleTextToken).toHaveBeenCalledWith(
        "https://opedd.substack.com",
        "test-jwt",
      );
    });
    // Active mode rendered: TokenDisplay shows the token + Verify button visible
    await waitFor(() => {
      expect(screen.getByTestId("token-display-value").textContent).toBe(
        "opedd-verify-A8F9C2BX",
      );
    });
    expect(screen.getByTestId("step2-verify")).toBeInTheDocument();
  });

  it("URL submit persists URL via wizard.saveStepData before issuing token", async () => {
    mockIssueVisibleTextToken.mockResolvedValue({
      verified: false,
      method: "visible_text_token",
      awaiting_confirmation: true,
      reason: "token_issued",
      expires_in_seconds: 86400,
      instructions: {
        record_type: "visible_text",
        name: "https://opedd.substack.com/about",
        value: "opedd-verify-A8F9C2BX",
        ttl: 86400,
      },
    });
    const wizardState = defaultWizardState();
    mockHookReturn.mockReturnValue(wizardState);

    await renderAndSettle();
    fireEvent.change(screen.getByTestId("step2-url-input"), {
      target: { value: "opedd.substack.com" },
    });
    fireEvent.click(screen.getByTestId("step2-url-submit"));

    await waitFor(() => {
      expect(wizardState.saveStepData).toHaveBeenCalledWith({
        substack_url: "https://opedd.substack.com",
      });
    });
  });

  it("URL submit with empty input shows validation error, no API call", async () => {
    await renderAndSettle();
    fireEvent.click(screen.getByTestId("step2-url-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("step2-url-submit")).toBeDisabled();
    });
    expect(mockIssueVisibleTextToken).not.toHaveBeenCalled();
  });
});

// ─── Active → Verify flow ────────────────────────────────────────────

describe("Step2Substack — verify flow", () => {
  beforeEach(() => {
    // Pre-seed mount in active mode: visible_text_token challenge present
    mockGet.mockResolvedValue({
      ownership_verification: {
        method: "visible_text_token",
        status: "pending",
        challenge: {
          token_hash: "x".repeat(64),
          publication_url: "https://opedd.substack.com",
          expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          attempt_count: 0,
          regen_count: 0,
        },
      },
      is_verified: false,
    });
  });

  it("verify success transitions to success mode and fires finalize calls", async () => {
    mockIssueVisibleTextToken.mockResolvedValue({
      verified: false,
      method: "visible_text_token",
      awaiting_confirmation: true,
      reason: "token_issued",
      expires_in_seconds: 86400,
      instructions: {
        record_type: "visible_text",
        name: "https://opedd.substack.com/about",
        value: "opedd-verify-A8F9C2BX",
        ttl: 86400,
      },
    });
    mockVerifyVisibleTextToken.mockResolvedValue({
      verified: true,
      method: "visible_text_token",
      evidence: {
        publication_url: "https://opedd.substack.com",
        scraped_at: new Date().toISOString(),
      },
    });
    const wizardState = defaultWizardState({
      setupData: { platform: "substack", substack_url: "https://opedd.substack.com" },
    });
    mockHookReturn.mockReturnValue(wizardState);

    await renderAndSettle();
    // Active mode requires re-issue (resume doesn't include plaintext)
    await waitFor(() =>
      expect(screen.getByTestId("step2-issue-fresh")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId("step2-issue-fresh"));
    await waitFor(() =>
      expect(screen.getByTestId("step2-verify")).not.toBeDisabled(),
    );

    fireEvent.click(screen.getByTestId("step2-verify"));

    await waitFor(() => {
      expect(mockVerifyVisibleTextToken).toHaveBeenCalledWith("test-jwt");
    });
    // Success state + auto-finalize fires the parallel calls
    await waitFor(() => {
      expect(screen.getByTestId("step2-success")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(mockEdgeFetch).toHaveBeenCalledWith(
        expect.stringContaining("/import-substack-rss"),
        expect.any(Object),
        "test-jwt",
      );
      expect(mockEdgeFetch).toHaveBeenCalledWith(
        expect.stringContaining("/extract-branding"),
        expect.any(Object),
        "test-jwt",
      );
    });
    // Critical: wizard.advance fires after finalize
    await waitFor(() => {
      expect(wizardState.advance).toHaveBeenCalledWith({});
    });
  });

  it("verify failure (token_not_found_in_about_page) shows friendly retry message; no advance", async () => {
    mockIssueVisibleTextToken.mockResolvedValue({
      verified: false,
      method: "visible_text_token",
      awaiting_confirmation: true,
      reason: "token_issued",
      expires_in_seconds: 86400,
      instructions: {
        record_type: "visible_text",
        name: "https://opedd.substack.com/about",
        value: "opedd-verify-A8F9C2BX",
        ttl: 86400,
      },
    });
    mockVerifyVisibleTextToken.mockResolvedValue({
      verified: false,
      method: "visible_text_token",
      reason: "token_not_found_in_about_page",
    });
    const wizardState = defaultWizardState({
      setupData: { platform: "substack", substack_url: "https://opedd.substack.com" },
    });
    mockHookReturn.mockReturnValue(wizardState);

    await renderAndSettle();
    await waitFor(() =>
      expect(screen.getByTestId("step2-issue-fresh")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId("step2-issue-fresh"));
    await waitFor(() =>
      expect(screen.getByTestId("step2-verify")).not.toBeDisabled(),
    );

    fireEvent.click(screen.getByTestId("step2-verify"));

    await waitFor(() => {
      expect(screen.getByTestId("step2-error").textContent).toMatch(
        /didn't find the token/i,
      );
    });
    expect(wizardState.advance).not.toHaveBeenCalled();
  });
});

// ─── Mount-time resume scenarios ─────────────────────────────────────

describe("Step2Substack — resume on mount", () => {
  it("is_verified=true on mount renders success state with Continue", async () => {
    mockGet.mockResolvedValue({
      ownership_verification: {
        method: "visible_text_token",
        status: "verified",
      },
      is_verified: true,
    });

    await renderAndSettle();
    await waitFor(() => {
      expect(screen.getByTestId("step2-success")).toBeInTheDocument();
    });
  });

  it("error state shown when mount GETs fail", async () => {
    mockGet.mockRejectedValue(new Error("network down"));

    render(<Step2Substack />);
    await waitFor(() => {
      expect(screen.getByText(/network down|please refresh/i)).toBeInTheDocument();
    });
  });
});

// ─── DNS sidebar visibility ──────────────────────────────────────────

describe("Step2Substack — DNS sidebar", () => {
  it("DNS sidebar hidden for *.substack.com URLs", async () => {
    mockIssueVisibleTextToken.mockResolvedValue({
      verified: false,
      method: "visible_text_token",
      awaiting_confirmation: true,
      reason: "token_issued",
      expires_in_seconds: 86400,
      instructions: {
        record_type: "visible_text",
        name: "https://opedd.substack.com/about",
        value: "opedd-verify-A8F9C2BX",
        ttl: 86400,
      },
    });

    await renderAndSettle();
    fireEvent.change(screen.getByTestId("step2-url-input"), {
      target: { value: "opedd.substack.com" },
    });
    fireEvent.click(screen.getByTestId("step2-url-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("step2-action-a")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("step2-dns-sidebar")).toBeNull();
  });

  it("DNS sidebar visible for custom-domain URLs", async () => {
    mockIssueVisibleTextToken.mockResolvedValue({
      verified: false,
      method: "visible_text_token",
      awaiting_confirmation: true,
      reason: "token_issued",
      expires_in_seconds: 86400,
      instructions: {
        record_type: "visible_text",
        name: "https://chinatalk.media/about",
        value: "opedd-verify-A8F9C2BX",
        ttl: 86400,
      },
    });

    await renderAndSettle();
    fireEvent.change(screen.getByTestId("step2-url-input"), {
      target: { value: "chinatalk.media" },
    });
    fireEvent.click(screen.getByTestId("step2-url-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("step2-dns-sidebar")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("step2-dns-enable")).toBeInTheDocument();
  });
});

// ─── Action B (inbound_email) rendering ──────────────────────────────

describe("Step2Substack — Action B inbound_email", () => {
  it("renders inbound_email from publisher-profile GET in Action B section", async () => {
    mockIssueVisibleTextToken.mockResolvedValue({
      verified: false,
      method: "visible_text_token",
      awaiting_confirmation: true,
      reason: "token_issued",
      expires_in_seconds: 86400,
      instructions: {
        record_type: "visible_text",
        name: "https://opedd.substack.com/about",
        value: "opedd-verify-A8F9C2BX",
        ttl: 86400,
      },
    });

    await renderAndSettle();
    fireEvent.change(screen.getByTestId("step2-url-input"), {
      target: { value: "opedd.substack.com" },
    });
    fireEvent.click(screen.getByTestId("step2-url-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("step2-inbound-email").textContent).toBe(
        "opedd+abc12345d678@inbound.opedd.com",
      ),
    );
  });
});
