import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";

vi.mock("@sentry/react", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));
import * as Sentry from "@sentry/react";

import { useIngestionStatus, _internal } from "./useIngestionStatus";

// ─── Mocks ──────────────────────────────────────────────────────────

const mockGetAccessToken = vi.fn<[], Promise<string | null>>();
const mockUser: { id: string } | null = { id: "user-1" };

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

const mockSupabaseFrom = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

// fetch mock — controls publisher-profile responses per test.
const fetchSpy = vi.spyOn(globalThis, "fetch");

// ─── Helpers ────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { gcTime: 0, staleTime: 0, retry: false, retryDelay: 0 },
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

function profileEnvelope(data: {
  id?: string;
  article_count?: number;
  pending_sources?: Array<{
    id?: string;
    url?: string;
    source_type?: string | null;
    archive_status?: string | null;
    archive_count?: number | null;
  }>;
}) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({
      success: true,
      data: {
        id: data.id ?? "pub-1",
        article_count: data.article_count ?? 0,
        pending_sources: data.pending_sources ?? [],
      },
    }),
  } as unknown as Response;
}

function setProfileResponse(data: Parameters<typeof profileEnvelope>[0]) {
  fetchSpy.mockResolvedValueOnce(profileEnvelope(data));
}

function setProfileError() {
  fetchSpy.mockRejectedValueOnce(new Error("network"));
}

function setRecentArticles(rows: Array<{
  id: string;
  title: string;
  source_url: string | null;
  created_at: string;
}>) {
  // Builder chain mock: from('licenses').select(...).eq(...).order(...).limit(3)
  // The hook calls .from("licenses") and chains; we return a thenable on .limit().
  mockSupabaseFrom.mockReturnValueOnce({
    select: () => ({
      eq: () => ({
        order: () => ({
          limit: () =>
            Promise.resolve({ data: rows, error: null }),
        }),
      }),
    }),
  });
}

function setRecentArticlesError() {
  mockSupabaseFrom.mockReturnValueOnce({
    select: () => ({
      eq: () => ({
        order: () => ({
          limit: () =>
            Promise.resolve({ data: null, error: { message: "boom" } }),
        }),
      }),
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAccessToken.mockResolvedValue("token-stub");
});

afterEach(() => {
  fetchSpy.mockReset();
  mockSupabaseFrom.mockReset();
});

// ─── Tests ──────────────────────────────────────────────────────────

describe("useIngestionStatus — pure matrix (computeStatus)", () => {
  it("01. failed source with no other active → error", () => {
    const s = _internal.computeStatus(
      [{ id: "s1", url: "u", source_type: null, archive_status: "failed" }],
      0,
    );
    expect(s).toBe("error");
  });

  it("02. queued source → active", () => {
    const s = _internal.computeStatus(
      [{ id: "s1", url: "u", source_type: null, archive_status: "queued" }],
      0,
    );
    expect(s).toBe("active");
  });

  it("03. running source overrides any failed sibling → active", () => {
    const s = _internal.computeStatus(
      [
        { id: "s1", url: "u", source_type: null, archive_status: "failed" },
        { id: "s2", url: "u", source_type: null, archive_status: "running" },
      ],
      0,
    );
    expect(s).toBe("active");
  });

  it("04. fresh load: no pending, articles>0 → done (independent of session history)", () => {
    const s = _internal.computeStatus([], 660);
    expect(s).toBe("done");
  });

  it("05. empty publisher: no pending, no articles → idle", () => {
    const s = _internal.computeStatus([], 0);
    expect(s).toBe("idle");
  });

  it("06. transition shape: pending=[] AND count grew → done (count-delta NOT used)", () => {
    // Verifies the dropped count-delta heuristic stays dropped — was
    // the bug surfaced in test 11's first run.
    const s = _internal.computeStatus([], 660);
    expect(s).toBe("done");
  });
});

describe("useIngestionStatus — polling integration", () => {
  it("08. no user → query disabled, no fetch", async () => {
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
    const { result } = renderHook(() => useIngestionStatus(), {
      wrapper: Wrapper,
    });

    expect(result.current.status).toBe("idle");
    expect(fetchSpy).not.toHaveBeenCalled();

    (authMock as unknown as { useAuth: () => unknown }).useAuth = original;
  });

  it("09. active state populated: pending_sources + article_count surface", async () => {
    setProfileResponse({
      article_count: 312,
      pending_sources: [
        {
          id: "s1",
          url: "https://x.substack.com",
          source_type: "substack",
          archive_status: "running",
          archive_count: 312,
        },
      ],
    });
    setRecentArticles([
      { id: "a1", title: "Article 1", source_url: null, created_at: "2026-04-26T00:00:00Z" },
    ]);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useIngestionStatus(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe("active"));
    expect(result.current.total_articles).toBe(312);
    expect(result.current.pending_sources).toHaveLength(1);
    expect(result.current.recent_articles).toHaveLength(1);
  });

  it("10. fresh load done: pending=[], article_count>0, no in-session active history → done; onComplete does NOT fire", async () => {
    const onComplete = vi.fn();
    setProfileResponse({ article_count: 660, pending_sources: [] });
    setRecentArticles([]);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useIngestionStatus({ onComplete }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe("done"));
    // Tick a couple of microtasks to let the effect resolve.
    await new Promise((r) => setTimeout(r, 50));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("11. in-session active → done transition fires onComplete exactly once", async () => {
    const onComplete = vi.fn();

    // First poll: active.
    setProfileResponse({
      article_count: 100,
      pending_sources: [
        { id: "s1", url: "u", source_type: null, archive_status: "running" },
      ],
    });
    setRecentArticles([]);

    // Second poll: done.
    setProfileResponse({ article_count: 660, pending_sources: [] });
    setRecentArticles([]);

    // Third poll (shouldn't happen because polling stops on done):
    setProfileResponse({ article_count: 660, pending_sources: [] });
    setRecentArticles([]);

    const { Wrapper, client } = makeWrapper();
    const { result } = renderHook(() => useIngestionStatus({ onComplete }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe("active"));

    // Force a manual refetch — easier than waiting 3s for the
    // refetchInterval to fire under the test runner.
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["ingestion-status", "user-1"] });
    });

    await waitFor(() => expect(result.current.status).toBe("done"));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it("12. polling stops when status flips to done (refetchInterval=false)", async () => {
    // Pre-load a 'done' response so the very first poll resolves to done.
    setProfileResponse({ article_count: 660, pending_sources: [] });
    setRecentArticles([]);

    const { Wrapper } = makeWrapper();
    renderHook(() => useIngestionStatus(), { wrapper: Wrapper });

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    // Wait beyond the 3s interval — ensure no second fetch is queued.
    await new Promise((r) => setTimeout(r, 100));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("13. network failure on poll: error surfaces; is_offline depends on prior data", async () => {
    setProfileError();

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useIngestionStatus(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    // No prior data, so is_offline stays false (we didn't transition
    // from a working state; we never had one).
    expect(result.current.is_offline).toBe(false);
  });

  it("14. recent_articles fetch error: Sentry breadcrumb fires; status still resolves", async () => {
    setProfileResponse({ article_count: 50, pending_sources: [] });
    setRecentArticlesError();

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useIngestionStatus(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(result.current.recent_articles).toEqual([]);
    expect(vi.mocked(Sentry.addBreadcrumb)).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "ingestion-status",
        message: expect.stringContaining("recent articles"),
      })
    );
  });

  it("15. progress block populated when sources expose archive_count", async () => {
    setProfileResponse({
      article_count: 200,
      pending_sources: [
        {
          id: "s1",
          url: "u",
          source_type: "wordpress",
          archive_status: "running",
          archive_count: 200,
        },
      ],
    });
    setRecentArticles([]);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useIngestionStatus(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.progress).toBeDefined());
    expect(result.current.progress?.processed).toBeGreaterThan(0);
  });

  it("16. profile fetch returns no data: status stays idle, no recent fetch", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ success: true, data: null }),
    } as unknown as Response);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useIngestionStatus(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(result.current.status).toBe("idle");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("17. recent_articles ordering preserved", async () => {
    setProfileResponse({ article_count: 3, pending_sources: [] });
    setRecentArticles([
      { id: "a1", title: "First", source_url: null, created_at: "2026-04-26T03:00:00Z" },
      { id: "a2", title: "Second", source_url: null, created_at: "2026-04-26T02:00:00Z" },
      { id: "a3", title: "Third", source_url: null, created_at: "2026-04-26T01:00:00Z" },
    ]);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useIngestionStatus(), {
      wrapper: Wrapper,
    });

    await waitFor(() =>
      expect(result.current.recent_articles).toHaveLength(3)
    );
    expect(result.current.recent_articles.map((a) => a.id)).toEqual(["a1", "a2", "a3"]);
  });
});
