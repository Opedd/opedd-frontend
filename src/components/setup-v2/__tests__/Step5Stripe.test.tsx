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

// Mock useAuth — Step5Stripe needs getAccessToken to call stripeApi
const mockGetAccessToken = vi.fn(async () => "test-jwt");
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ getAccessToken: mockGetAccessToken, user: { id: "u1" } }),
}));

// Mock useWizardState — controlled per-test via mockHookReturn
const mockHookReturn = vi.fn<() => UseWizardStateResult>();
vi.mock("@/hooks/useWizardState", () => ({
  useWizardState: () => mockHookReturn(),
}));

// Mock stripeApi — controlled per-test
const mockConnect = vi.fn();
const mockStatus = vi.fn();
const mockDashboard = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    stripeApi: {
      connect: (...args: unknown[]) => mockConnect(...args),
      status: (...args: unknown[]) => mockStatus(...args),
      dashboard: (...args: unknown[]) => mockDashboard(...args),
    },
  };
});

import { Step5Stripe } from "../Step5Stripe";

function defaultWizardState(
  overrides: Partial<UseWizardStateResult> = {},
): UseWizardStateResult {
  return {
    state: { publisher_id: "p1", setup_state: "in_setup", setup_step: 5, setup_data: {} } as never,
    setupState: "in_setup",
    currentStep: 5 as WizardStep,
    setupData: {},
    dormant: false,
    canAdvance: true,
    canRegress: false,
    nextStep: 5 as WizardStep,
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
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_disabled_reason: string | null;
}

/** Mock the publisher-profile fetch the component does on mount. */
function mockProfileFetch(slice: ProfileSlice): void {
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

function Wrapper({
  children,
  initialEntry = "/setup-v2",
}: {
  children: ReactNode;
  initialEntry?: string;
}) {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  mockHookReturn.mockReturnValue(defaultWizardState());
});

describe("Step5Stripe — state: not-connected", () => {
  it("01. renders 'Connect Stripe' CTA + skip link + escrow framing copy", async () => {
    mockProfileFetch({
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      stripe_disabled_reason: null,
    });
    render(<Wrapper><Step5Stripe /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Connect Stripe/i })).toBeTruthy();
    });
    expect(
      screen.getByText(/We'll hold your earnings in Opedd escrow/i),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Skip — finish later/i }),
    ).toBeTruthy();
    // No StripeDisabledReasonDisplay should render
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("02. clicking 'Connect Stripe' calls stripeApi.connect with return_path='/setup-v2', sets window.location.href to onboarding_url", async () => {
    mockProfileFetch({
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      stripe_disabled_reason: null,
    });
    mockConnect.mockResolvedValue({
      onboarding_url: "https://connect.stripe.com/setup/mock-url",
      stripe_account_id: "acct_mock",
    });

    // Replace location.href with a settable mock — JSDOM allows this via
    // delete + assign on the window.location property.
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...originalLocation, href: "https://opedd.com/setup-v2" },
    });

    render(<Wrapper><Step5Stripe /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Connect Stripe/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Connect Stripe/i }));

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledWith("/setup-v2", "test-jwt");
    });
    await waitFor(() => {
      expect(window.location.href).toBe(
        "https://connect.stripe.com/setup/mock-url",
      );
    });

    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });
});

describe("Step5Stripe — state: partial (connected, onboarding incomplete)", () => {
  it("03. renders StripeDisabledReasonDisplay + 'Resume Stripe setup' CTA, NO escrow copy", async () => {
    mockProfileFetch({
      stripe_account_id: "acct_partial",
      stripe_onboarding_complete: false,
      stripe_disabled_reason:
        "currently_due:individual.address.city,individual.dob.day",
    });
    render(<Wrapper><Step5Stripe /></Wrapper>);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Resume Stripe setup/i }),
      ).toBeTruthy();
    });
    expect(screen.getByText(/Stripe is waiting on one more step/i)).toBeTruthy();
    expect(
      screen.getByText("Missing: individual address city, individual dob day"),
    ).toBeTruthy();
    // Escrow copy NOT rendered in partial state
    expect(
      screen.queryByText(/We'll hold your earnings in Opedd escrow/i),
    ).toBeNull();
    // Skip path still available
    expect(
      screen.getByRole("button", { name: /Skip — finish later/i }),
    ).toBeTruthy();
  });
});

describe("Step5Stripe — state: complete", () => {
  it("04a. renders success state + Continue button (visual structure)", async () => {
    mockProfileFetch({
      stripe_account_id: "acct_complete",
      stripe_onboarding_complete: true,
      stripe_disabled_reason: null,
    });
    render(<Wrapper><Step5Stripe /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByText(/Stripe connected/i)).toBeTruthy();
    });
    expect(
      screen.getByText(
        /You're ready to receive payouts when buyers license your content/i,
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Continue$/i })).toBeTruthy();
    // No skip option in complete state
    expect(
      screen.queryByRole("button", { name: /Skip/i }),
    ).toBeNull();
  });

  it("04b. clicking Continue button fires wizard.advance({})", async () => {
    const advance = vi.fn().mockResolvedValue({});
    mockHookReturn.mockReturnValue(defaultWizardState({ advance }));
    mockProfileFetch({
      stripe_account_id: "acct_complete",
      stripe_onboarding_complete: true,
      stripe_disabled_reason: null,
    });
    render(<Wrapper><Step5Stripe /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Continue$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));

    await waitFor(() => {
      expect(advance).toHaveBeenCalledWith({});
    });
  });
});

describe("Step5Stripe — skip path", () => {
  it("05. clicking 'Skip' in not-connected state fires wizard.advance({}) with no Stripe API call", async () => {
    const advance = vi.fn().mockResolvedValue({});
    mockHookReturn.mockReturnValue(defaultWizardState({ advance }));
    mockProfileFetch({
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      stripe_disabled_reason: null,
    });
    render(<Wrapper><Step5Stripe /></Wrapper>);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Skip — finish later/i }),
      ).toBeTruthy();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Skip — finish later/i }),
    );

    await waitFor(() => {
      expect(advance).toHaveBeenCalledWith({});
    });
    // No Stripe API call should have been made by the skip path
    expect(mockConnect).not.toHaveBeenCalled();
    expect(mockStatus).not.toHaveBeenCalled();
  });
});

describe("Step5Stripe — ?stripe=* redirect handling", () => {
  it("06. ?stripe=success on mount triggers stripeApi.status() then refreshes profile", async () => {
    mockProfileFetch({
      stripe_account_id: "acct_complete",
      stripe_onboarding_complete: true,
      stripe_disabled_reason: null,
    });
    mockStatus.mockResolvedValue({
      connected: true,
      onboarding_complete: true,
      charges_enabled: true,
      payouts_enabled: true,
    });

    render(
      <Wrapper initialEntry="/setup-v2?stripe=success">
        <Step5Stripe />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(mockStatus).toHaveBeenCalledWith("test-jwt");
    });
    // After stripe_status forces sync + profile refresh, complete state
    // surfaces because the mock profile slice indicates onboarding_complete=true.
    await waitFor(() => {
      expect(screen.getByText(/Stripe connected/i)).toBeTruthy();
    });
  });

  it("07. ?stripe=error on mount renders error state with retry option", async () => {
    mockProfileFetch({
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      stripe_disabled_reason: null,
    });

    render(
      <Wrapper initialEntry="/setup-v2?stripe=error">
        <Step5Stripe />
      </Wrapper>,
    );

    // Heading-level assertion (more specific than getByText which would
    // match both the h1 and the descriptive paragraph below it).
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Stripe connection failed/i }),
      ).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: /Try again/i }),
    ).toBeTruthy();
    // Should NOT show the normal "Connect Stripe" CTA in error state
    expect(
      screen.queryByRole("button", { name: /^Connect Stripe$/i }),
    ).toBeNull();
  });
});
