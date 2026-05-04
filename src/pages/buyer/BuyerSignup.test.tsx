// KI #97 (2026-05-04): tests for the BuyerSignup waiting-room gate.
//
// Pre-KI-#97 race: AuthContext.getSession() can resolve with null BEFORE
// the SDK's auto-detect finishes processing ?code=. The stage-gate effect
// then runs with !user and falls through to setStage("magic-link"),
// stranding authed users on the unauthed entry form. The fix detects
// ?code= / #access_token= on mount and holds stage="checking" until
// either SIGNED_IN fires (user populates) or a 5s timeout expires.
//
// Test surface covers all 7 cases approved in the design proposal:
//   1. Mount with no auth params, !user → "magic-link" immediately (regression check)
//   2. Mount with ?code=, !user, no SIGNED_IN within 5s → "magic-link" + toast
//   3. Mount with ?code=, !user, SIGNED_IN at 1s → "signup-form" via re-render
//   4. Mount with #access_token=, !user → same waiting-room as case 2/3 (defensive)
//   5. Mount with ?code=, user already populated (fast-path) → "signup-form" immediately
//   6. Magic-link form submit → signInWithOtp called (regression check)
//   7. Mount with ?error_code=otp_expired (no code=) → "magic-link" immediately

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks (must be declared before component import) ────────────

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockSignInWithOtp = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
    },
  },
}));

const mockGetBuyerAccount = vi.fn();
vi.mock("@/lib/buyerApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/buyerApi")>();
  return {
    ...actual,
    getBuyerAccount: (...args: unknown[]) => mockGetBuyerAccount(...args),
    signupBuyer: vi.fn(),
  };
});

vi.mock("@/components/buyer/OneTimeKeyModal", () => ({
  OneTimeKeyModal: () => <div data-testid="key-modal" />,
}));

vi.mock("@/components/SEO", () => ({
  default: () => null,
}));

vi.mock("@/hooks/useDocumentTitle", () => ({
  useDocumentTitle: () => undefined,
}));

import BuyerSignup from "./BuyerSignup";

// ─── URL state helper ─────────────────────────────────────────────
//
// `codeInUrl` reads window.location.search/hash on mount via lazy
// useState. To control what the component sees, we stub window.location
// before each render. jsdom's default location is read-only on some
// fields; defineProperty bypasses the restriction.

function setUrl(search: string, hash: string = "") {
  Object.defineProperty(window, "location", {
    value: {
      ...window.location,
      search,
      hash,
      origin: "https://opedd.com",
      href: `https://opedd.com/buyer/signup${search}${hash}`,
    },
    writable: true,
    configurable: true,
  });
}

// ─── Setup / teardown ─────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setUrl("");
});

afterEach(() => {
  vi.useRealTimers();
});

function renderBuyerSignup() {
  return render(
    <MemoryRouter initialEntries={["/buyer/signup"]}>
      <BuyerSignup />
    </MemoryRouter>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────

describe("BuyerSignup — waiting-room gate (KI #97)", () => {
  it("Case 1: no auth params + !user → magic-link form immediately", async () => {
    setUrl("");
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      getAccessToken: vi.fn(),
    });

    renderBuyerSignup();

    expect(await screen.findByText(/Sign up as a buyer/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@yourlab\.com/i)).toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("Case 2: ?code= + !user + no SIGNED_IN within 5s → magic-link + toast", async () => {
    vi.useFakeTimers();
    setUrl("?code=550e8400-e29b-41d4-a716-446655440000");
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      getAccessToken: vi.fn(),
    });

    const { container } = renderBuyerSignup();

    // Initial: stage="checking", spinner visible (no form yet)
    expect(container.querySelector("svg")).toBeTruthy();
    expect(screen.queryByText(/Sign up as a buyer/i)).toBeNull();

    // Advance 5s: timeout fires → stage transitions + toast called.
    // Direct assertion (not waitFor) — waitFor deadlocks with fake timers
    // because its polling setTimeout never advances.
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Sign-in didn't complete",
        description: "Please request a new sign-in link.",
        variant: "destructive",
      }),
    );
    expect(screen.getByText(/Sign up as a buyer/i)).toBeInTheDocument();
  });

  it("Case 3: ?code= + !user, then SIGNED_IN at 1s → signup-form via re-render", async () => {
    vi.useFakeTimers();
    setUrl("?code=550e8400-e29b-41d4-a716-446655440000");
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      getAccessToken: vi.fn(),
    });
    mockGetBuyerAccount.mockResolvedValue(null); // no buyer row yet

    const { container, rerender } = renderBuyerSignup();
    expect(container.querySelector("svg")).toBeTruthy();

    // Simulate SIGNED_IN at t=1s: user populates
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "alexandre.n.bridi+phase533@gmail.com" },
      isLoading: false,
      getAccessToken: vi.fn(async () => "fake-token"),
    });

    rerender(
      <MemoryRouter initialEntries={["/buyer/signup"]}>
        <BuyerSignup />
      </MemoryRouter>,
    );

    // Effect re-runs with user populated → fetches buyer account → null →
    // stage="signup-form" with email pre-filled
    vi.useRealTimers();
    await waitFor(() => {
      expect(mockGetBuyerAccount).toHaveBeenCalledWith("fake-token");
    });

    // Toast should NOT have fired (timeout cleaned up before 5s)
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: "Sign-in didn't complete" }),
    );
  });

  it("Case 4: #access_token= + !user → waiting-room (defensive guard for legacy implicit flow)", async () => {
    vi.useFakeTimers();
    setUrl("", "#access_token=eyJfaketoken");
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      getAccessToken: vi.fn(),
    });

    const { container } = renderBuyerSignup();

    // Spinner shown (waiting-room held)
    expect(container.querySelector("svg")).toBeTruthy();
    expect(screen.queryByText(/Sign up as a buyer/i)).toBeNull();

    // 5s timeout fires. Direct assertion (waitFor deadlocks with fake timers).
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockToast).toHaveBeenCalled();
  });

  it("Case 5: ?code= + user already populated → signup-form immediately (fast path)", async () => {
    setUrl("?code=550e8400-e29b-41d4-a716-446655440000");
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "alexandre.n.bridi+phase534@gmail.com" },
      isLoading: false,
      getAccessToken: vi.fn(async () => "fake-token"),
    });
    mockGetBuyerAccount.mockResolvedValue(null);

    renderBuyerSignup();

    await waitFor(() => {
      expect(mockGetBuyerAccount).toHaveBeenCalledWith("fake-token");
    });
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("Case 6: magic-link form submit calls signInWithOtp with correct emailRedirectTo", async () => {
    setUrl("");
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      getAccessToken: vi.fn(),
    });
    mockSignInWithOtp.mockResolvedValue({ error: null });

    renderBuyerSignup();

    const emailInput = await screen.findByPlaceholderText(/you@yourlab\.com/i);
    fireEvent.change(emailInput, {
      target: { value: "alexandre.n.bridi+phase535@gmail.com" },
    });

    const submitBtn = screen.getByRole("button", { name: /Send magic link/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "alexandre.n.bridi+phase535@gmail.com",
          options: expect.objectContaining({
            emailRedirectTo: "https://opedd.com/buyer/signup",
          }),
        }),
      );
    });
  });

  it("Case 7: ?error_code=otp_expired (no code=) + !user → magic-link immediately, no waiting-room", async () => {
    vi.useFakeTimers();
    setUrl("?error=access_denied&error_code=otp_expired");
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      getAccessToken: vi.fn(),
    });

    renderBuyerSignup();

    // Effect runs immediately: codeInUrl=false (no "code=" or "access_token=")
    // → !user branch → setStage("magic-link") → form rendered, no spinner
    await act(async () => {
      // Let effect synchronously settle
    });

    expect(screen.getByText(/Sign up as a buyer/i)).toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();

    // Advance 5s: NO timeout should fire (it was never scheduled)
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    expect(mockToast).not.toHaveBeenCalled();
  });
});
