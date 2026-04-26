import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";

// Sentry mocked here (top-level) because vitest cannot vi.spyOn ESM
// module exports — the namespace is non-configurable. We import the
// mocked namespace below for assertions.
vi.mock("@sentry/react", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));
import * as Sentry from "@sentry/react";

import { useWizardState, _internal } from "./useWizardState";
import {
  WizardStateError,
  type SetupState,
  type WizardStateView,
  type WizardStep,
} from "@/lib/api";

// ─── Mocks ──────────────────────────────────────────────────────────

const mockGetAccessToken = vi.fn<[], Promise<string | null>>();
const mockUser = { id: "user-1" };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    session: null,
    accessToken: "token-stub",
    isLoading: false,
    logout: vi.fn(),
    getAccessToken: mockGetAccessToken,
  }),
}));

const mockApi = {
  get: vi.fn(),
  advance: vi.fn(),
  regress: vi.fn(),
  saveStepData: vi.fn(),
};

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    wizardStateApi: {
      get: (...args: unknown[]) => mockApi.get(...args),
      advance: (...args: unknown[]) => mockApi.advance(...args),
      regress: (...args: unknown[]) => mockApi.regress(...args),
      saveStepData: (...args: unknown[]) => mockApi.saveStepData(...args),
    },
  };
});

// ─── Fixtures ───────────────────────────────────────────────────────

function viewAt(
  state: SetupState,
  step: WizardStep,
  overrides: Partial<WizardStateView> = {}
): WizardStateView {
  return {
    publisher_id: "pub-1",
    setup_state: state,
    setup_step: step,
    setup_data: {},
    setup_complete: state === "connected" || state === "verified",
    dormant: false,
    verification_status: state === "verified" ? "verified" : "pending",
    can_advance: state === "prospect" || state === "in_setup",
    can_regress: state === "in_setup" && (step === 2 || step === 3),
    next_step:
      state === "prospect"
        ? 1
        : state === "in_setup" && step <= 4
        ? ((step + 1) as WizardStep)
        : state === "in_setup" && step === 5
        ? 5
        : null,
    prev_step:
      state === "in_setup" && (step === 2 || step === 3)
        ? ((step - 1) as WizardStep)
        : null,
    ...overrides,
  };
}

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      // retryDelay 0 so the hook's retry-once-on-5xx logic fires
      // synchronously in tests without leaning on waitFor's default
      // 1000ms. The hook's per-query retry function still controls
      // whether to retry; we just zero the delay between attempts.
      queries: { gcTime: 0, staleTime: 0, retryDelay: 0 },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  }
  return { client, Wrapper };
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockGetAccessToken.mockResolvedValue("token-stub");
});

afterEach(() => {
  localStorage.clear();
});

// ─── Tests ──────────────────────────────────────────────────────────

describe("useWizardState — hydration", () => {
  it("01. first render with empty cache: state=null, isLoading=true; resolves on GET", async () => {
    const view = viewAt("prospect", 1);
    let resolveGet: (v: WizardStateView) => void;
    mockApi.get.mockReturnValue(
      new Promise<WizardStateView>((res) => {
        resolveGet = res;
      })
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });

    expect(result.current.state).toBeNull();
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveGet!(view);
    });

    await waitFor(() => expect(result.current.state).toEqual(view));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.canAdvance).toBe(true);
    // GET success writes through to cache.
    expect(_internal.readCache("user-1")).toEqual(view);
  });

  it("02. cached state available synchronously; isLoading=false on first render", async () => {
    const cached = viewAt("in_setup", 3);
    _internal.writeCache("user-1", cached);
    mockApi.get.mockResolvedValue(cached);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });

    expect(result.current.state).toEqual(cached);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.currentStep).toBe(3);
    expect(result.current.canRegress).toBe(true);
  });

  it("03. cache is replaced by fresh server value after GET", async () => {
    const stale = viewAt("in_setup", 2);
    const fresh = viewAt("in_setup", 4);
    _internal.writeCache("user-1", stale);
    mockApi.get.mockResolvedValue(fresh);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });

    expect(result.current.currentStep).toBe(2);
    await waitFor(() => expect(result.current.currentStep).toBe(4));
    expect(_internal.readCache("user-1")).toEqual(fresh);
  });

  it("04. GET network failure with cache present: keeps cache, isOffline=true", async () => {
    const cached = viewAt("in_setup", 3);
    _internal.writeCache("user-1", cached);
    mockApi.get.mockRejectedValue(
      new WizardStateError("Network down", "INTERNAL_ERROR", 500)
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isOffline).toBe(true));
    expect(result.current.state).toEqual(cached);
    expect(result.current.error?.code).toBe("INTERNAL_ERROR");
  });

  it("05. corrupt cache JSON is ignored; falls through to GET; emits Sentry breadcrumb", async () => {
    localStorage.setItem("opedd:wizard-state:v1:user-1", "{not-valid-json");
    const fresh = viewAt("prospect", 1);
    mockApi.get.mockResolvedValue(fresh);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });

    expect(result.current.state).toBeNull();
    await waitFor(() => expect(result.current.state).toEqual(fresh));
    expect(vi.mocked(Sentry.addBreadcrumb)).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "wizard-state",
        message: expect.stringContaining("Corrupt"),
      })
    );
  });

  it("06. no user in AuthContext (signed out) keeps query disabled; no fetch", async () => {
    // Override the AuthContext mock to return null user for this test.
    const authMock = await import("@/contexts/AuthContext");
    const original = authMock.useAuth;
    (authMock as unknown as { useAuth: () => unknown }).useAuth = () => ({
      user: null,
      session: null,
      accessToken: null,
      isLoading: false,
      logout: vi.fn(),
      getAccessToken: mockGetAccessToken,
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });

    expect(result.current.state).toBeNull();
    expect(mockApi.get).not.toHaveBeenCalled();

    (authMock as unknown as { useAuth: () => unknown }).useAuth = original;
  });
});

describe("useWizardState — actions: happy path", () => {
  it("07. advance() advances state and writes cache", async () => {
    mockApi.get.mockResolvedValue(viewAt("prospect", 1));
    mockApi.advance.mockResolvedValue(viewAt("in_setup", 1));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state).not.toBeNull());

    let next: WizardStateView | undefined;
    await act(async () => {
      next = await result.current.advance({ platform: "substack" });
    });

    expect(next?.setup_state).toBe("in_setup");
    expect(next?.setup_step).toBe(1);
    expect(result.current.currentStep).toBe(1);
    expect(_internal.readCache("user-1")?.setup_step).toBe(1);
    // Verify the CAS preconditions came from cached state, not caller.
    expect(mockApi.advance).toHaveBeenCalledWith(
      expect.objectContaining({
        expected_state: "prospect",
        expected_step: 1,
        step_data: { platform: "substack" },
      }),
      "token-stub"
    );
  });

  it("08. regress() goes step 3 → 2", async () => {
    mockApi.get.mockResolvedValue(viewAt("in_setup", 3));
    mockApi.regress.mockResolvedValue(viewAt("in_setup", 2));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state).not.toBeNull());

    await act(async () => {
      await result.current.regress();
    });

    await waitFor(() => expect(result.current.currentStep).toBe(2));
  });

  it("09. saveStepData() merges via server-returned setup_data", async () => {
    mockApi.get.mockResolvedValue(
      viewAt("in_setup", 2, { setup_data: { platform: "ghost" } })
    );
    mockApi.saveStepData.mockResolvedValue(
      viewAt("in_setup", 2, {
        setup_data: { platform: "ghost", ghost_url: "https://x.ghost.io" },
      })
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state).not.toBeNull());

    await act(async () => {
      await result.current.saveStepData({ ghost_url: "https://x.ghost.io" });
    });

    await waitFor(() =>
      expect(result.current.setupData).toEqual({
        platform: "ghost",
        ghost_url: "https://x.ghost.io",
      })
    );
  });
});

describe("useWizardState — error paths", () => {
  it("10. STATE_MISMATCH triggers refetch; throws to caller without auto-replay", async () => {
    mockApi.get.mockResolvedValueOnce(viewAt("in_setup", 2));
    mockApi.advance.mockRejectedValueOnce(
      new WizardStateError("conflict", "STATE_MISMATCH", 409)
    );
    // The refetch after the mismatch surfaces the new server state.
    const fresh = viewAt("in_setup", 3);
    mockApi.get.mockResolvedValueOnce(fresh);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state).not.toBeNull());

    await act(async () => {
      await expect(result.current.advance()).rejects.toBeInstanceOf(
        WizardStateError
      );
    });

    await waitFor(() =>
      expect(result.current.error?.code).toBe("STATE_MISMATCH")
    );
    // advance was called exactly once — no auto-replay.
    expect(mockApi.advance).toHaveBeenCalledTimes(1);
    // Background refetch should have happened.
    await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(2));
  });

  it("11. REGRESS_FORBIDDEN bubbles untouched; no extra refetch fired", async () => {
    mockApi.get.mockResolvedValue(viewAt("in_setup", 4));
    mockApi.regress.mockRejectedValue(
      new WizardStateError("nope", "REGRESS_FORBIDDEN", 422)
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state).not.toBeNull());
    const getCallsBefore = mockApi.get.mock.calls.length;

    await act(async () => {
      await expect(result.current.regress()).rejects.toMatchObject({
        code: "REGRESS_FORBIDDEN",
      });
    });

    expect(mockApi.get.mock.calls.length).toBe(getCallsBefore);
    await waitFor(() =>
      expect(result.current.error?.code).toBe("REGRESS_FORBIDDEN")
    );
  });

  it("12. PUBLISHER_NOT_FOUND surfaces as typed error; hook stays in error state", async () => {
    mockApi.get.mockRejectedValue(
      new WizardStateError("missing", "PUBLISHER_NOT_FOUND", 404)
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.code).toBe("PUBLISHER_NOT_FOUND");
    expect(result.current.error?.status).toBe(404);
    expect(result.current.state).toBeNull();
  });

  it("13. Network failure on mutation: error surfaces; cache unchanged", async () => {
    const before = viewAt("in_setup", 2);
    mockApi.get.mockResolvedValue(before);
    mockApi.advance.mockRejectedValue(
      new WizardStateError("network", "INTERNAL_ERROR", 500)
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state).toEqual(before));

    await act(async () => {
      await expect(result.current.advance()).rejects.toMatchObject({
        code: "INTERNAL_ERROR",
      });
    });

    // Cache value unchanged — failed mutation does not corrupt state.
    expect(_internal.readCache("user-1")).toEqual(before);
    expect(result.current.state).toEqual(before);
    await waitFor(() =>
      expect(result.current.error?.code).toBe("INTERNAL_ERROR")
    );
  });
});

describe("useWizardState — concurrency + token freshness", () => {
  it("14. concurrent mutations: isMutating stays true while either is in flight", async () => {
    mockApi.get.mockResolvedValue(viewAt("in_setup", 3));
    let resolveAdvance: (v: WizardStateView) => void;
    let resolveRegress: (v: WizardStateView) => void;
    mockApi.advance.mockReturnValue(
      new Promise<WizardStateView>((r) => {
        resolveAdvance = r;
      })
    );
    mockApi.regress.mockReturnValue(
      new Promise<WizardStateView>((r) => {
        resolveRegress = r;
      })
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state).not.toBeNull());

    let advancePromise!: Promise<WizardStateView>;
    let regressPromise!: Promise<WizardStateView>;

    await act(async () => {
      advancePromise = result.current.advance().catch(() => viewAt("in_setup", 4));
      regressPromise = result.current.regress().catch(() => viewAt("in_setup", 2));
    });
    await waitFor(() => expect(result.current.isMutating).toBe(true));

    // Resolve advance first; isMutating still true because regress is in flight.
    await act(async () => {
      resolveAdvance!(viewAt("in_setup", 4));
      await advancePromise;
    });
    expect(result.current.isMutating).toBe(true);

    await act(async () => {
      resolveRegress!(viewAt("in_setup", 2));
      await regressPromise;
    });
    await waitFor(() => expect(result.current.isMutating).toBe(false));
  });

  it("15. Token refresh mid-mutation: getAccessToken called fresh on each call", async () => {
    mockApi.get.mockResolvedValue(viewAt("in_setup", 2));
    mockApi.advance.mockImplementation((_payload, token) =>
      Promise.resolve(viewAt("in_setup", 3, { setup_data: { token_used: token } }))
    );
    mockGetAccessToken
      .mockResolvedValueOnce("token-1")
      .mockResolvedValueOnce("token-2-rotated")
      .mockResolvedValue("token-2-rotated");

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state).not.toBeNull());

    await act(async () => {
      await result.current.advance();
    });

    // First call: query GET used token-1. Second call: mutation used token-2.
    expect(mockApi.advance).toHaveBeenCalledWith(
      expect.anything(),
      "token-2-rotated"
    );
  });

  it("16. localStorage quota exceeded: hook keeps working; Sentry breadcrumb", async () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

    const view = viewAt("in_setup", 1);
    mockApi.get.mockResolvedValue(view);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.state).toEqual(view));
    expect(result.current.error).toBeNull();
    expect(vi.mocked(Sentry.addBreadcrumb)).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "wizard-state",
        message: expect.stringContaining("quota"),
      })
    );

    setItemSpy.mockRestore();
  });

  it("17. Rapid double-click: second advance gets STATE_MISMATCH (CAS catches it)", async () => {
    // React Query does not de-dupe mutations natively, so two synchronous
    // advance() calls fire two HTTP requests. The second sends the SAME
    // expected_(state, step) as the first because state hasn't been
    // refreshed yet — but the server processes the first, advancing
    // (state, step) atomically; the second's CAS now mismatches and
    // returns STATE_MISMATCH. This is the correct CAS behavior; the UI
    // is expected to gate via isMutating to avoid the second click in
    // the first place.
    mockApi.get.mockResolvedValue(viewAt("in_setup", 1));
    let firstResolved = false;
    mockApi.advance.mockImplementation(async () => {
      if (!firstResolved) {
        firstResolved = true;
        return viewAt("in_setup", 2);
      }
      throw new WizardStateError("conflict", "STATE_MISMATCH", 409);
    });
    // Background refetch after STATE_MISMATCH.
    mockApi.get.mockResolvedValue(viewAt("in_setup", 2));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state).not.toBeNull());

    let p1!: Promise<WizardStateView>;
    let p2!: Promise<WizardStateView>;
    await act(async () => {
      p1 = result.current.advance();
      p2 = result.current.advance();
      await Promise.allSettled([p1, p2]);
    });

    await expect(p1).resolves.toMatchObject({ setup_step: 2 });
    await expect(p2).rejects.toMatchObject({ code: "STATE_MISMATCH" });
    expect(mockApi.advance).toHaveBeenCalledTimes(2);
  });
});

describe("useWizardState — soak-window legacy support", () => {
  it("18. step=6 from legacy publisher passes through; can_advance false", async () => {
    // Per migration 066 + INVARIANTS, the schema accepts setup_step
    // 1..6 (legacy). Hook tolerates 6 in the type and renders without
    // crashing. Server is the source of truth for can_advance / next_step;
    // for step=6 they resolve to false / null and the UI offers no
    // forward path.
    const legacy = viewAt("in_setup", 6 as WizardStep, {
      can_advance: false,
      can_regress: false,
      next_step: null,
      prev_step: null,
    });
    mockApi.get.mockResolvedValue(legacy);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.state).not.toBeNull());
    expect(result.current.currentStep).toBe(6);
    expect(result.current.canAdvance).toBe(false);
    expect(result.current.canRegress).toBe(false);
    expect(result.current.nextStep).toBeNull();
    expect(result.current.prevStep).toBeNull();
  });
});

describe("useWizardState — refetch", () => {
  it("19. refetch() re-issues GET and returns fresh data", async () => {
    const v1 = viewAt("in_setup", 2);
    const v2 = viewAt("in_setup", 3);
    mockApi.get.mockResolvedValueOnce(v1).mockResolvedValueOnce(v2);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWizardState(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state).toEqual(v1));

    let refetched: WizardStateView | null = null;
    await act(async () => {
      refetched = await result.current.refetch();
    });
    expect(refetched).toEqual(v2);
    await waitFor(() => expect(result.current.state).toEqual(v2));
  });
});
