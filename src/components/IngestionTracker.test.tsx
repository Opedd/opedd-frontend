import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import React from "react";

vi.mock("@sentry/react", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));
import * as Sentry from "@sentry/react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    session: null,
    accessToken: "stub",
    isLoading: false,
    logout: vi.fn(),
    getAccessToken: vi.fn(),
  }),
}));

import type { IngestionStatus } from "@/hooks/useIngestionStatus";

// Mock the hook so the component tests stay in pure-render territory.
const mockHookReturn = vi.fn<[], IngestionStatus>();
vi.mock("@/hooks/useIngestionStatus", () => ({
  useIngestionStatus: () => mockHookReturn(),
}));

import { IngestionTracker, _internal } from "./IngestionTracker";

function status(overrides: Partial<IngestionStatus> = {}): IngestionStatus {
  return {
    status: "idle",
    total_articles: 0,
    pending_sources: [],
    recent_articles: [],
    progress: undefined,
    is_offline: false,
    is_stalled: false,
    error: null,
    ...overrides,
  };
}

function Wrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("IngestionTracker — render states", () => {
  it("18. idle status → renders nothing", () => {
    mockHookReturn.mockReturnValue(status({ status: "idle" }));
    const { container } = render(<IngestionTracker />, { wrapper: Wrapper });
    expect(container.firstChild).toBeNull();
  });

  it("19. active status with progress + recent articles renders fully", () => {
    mockHookReturn.mockReturnValue(
      status({
        status: "active",
        total_articles: 312,
        pending_sources: [
          {
            id: "s1",
            url: "u",
            source_type: "wordpress",
            archive_status: "running",
            archive_count: 312,
          },
        ],
        progress: { discovered: 660, processed: 312, eta_minutes: 3 },
        recent_articles: [
          { id: "a1", title: "On Ukraine", source_url: null, created_at: "2026-04-26T00:00:00Z" },
          { id: "a2", title: "Energy Markets", source_url: null, created_at: "2026-04-26T00:00:00Z" },
        ],
      }),
    );
    render(<IngestionTracker mode="dashboard" />, { wrapper: Wrapper });
    expect(screen.getByTestId("ingestion-tracker-active")).toBeInTheDocument();
    expect(screen.getByText(/Indexing your archive/)).toBeInTheDocument();
    expect(screen.getByText(/312 of 660 articles/)).toBeInTheDocument();
    expect(screen.getByText(/~3 minutes remaining/)).toBeInTheDocument();
    expect(screen.getByText(/Recently indexed:/)).toBeInTheDocument();
    expect(screen.getByText(/On Ukraine/)).toBeInTheDocument();
  });

  it("20. active state with no progress block falls back to count-only rendering", () => {
    mockHookReturn.mockReturnValue(
      status({
        status: "active",
        total_articles: 25,
        pending_sources: [
          { id: "s1", url: "u", source_type: "substack", archive_status: "running" },
        ],
      }),
    );
    render(<IngestionTracker mode="dashboard" />, { wrapper: Wrapper });
    expect(screen.getByText(/25 articles indexed so far/)).toBeInTheDocument();
  });

  it("21. active + stalled subtitle shown", () => {
    mockHookReturn.mockReturnValue(
      status({
        status: "active",
        total_articles: 100,
        pending_sources: [
          { id: "s1", url: "u", source_type: null, archive_status: "running" },
        ],
        is_stalled: true,
      }),
    );
    render(<IngestionTracker mode="wizard" />, { wrapper: Wrapper });
    expect(screen.getByText(/Taking longer than expected/)).toBeInTheDocument();
  });

  it("22. done status shows persistent pill with article count", () => {
    mockHookReturn.mockReturnValue(
      status({ status: "done", total_articles: 660 }),
    );
    render(<IngestionTracker mode="wizard" />, { wrapper: Wrapper });
    expect(screen.getByTestId("ingestion-tracker-done")).toBeInTheDocument();
    expect(screen.getByText(/Archive ready · 660 articles/)).toBeInTheDocument();
  });

  it("23. error status renders with partial-import context", () => {
    mockHookReturn.mockReturnValue(
      status({ status: "error", total_articles: 412 }),
    );
    render(<IngestionTracker mode="dashboard" />, { wrapper: Wrapper });
    expect(screen.getByText(/Couldn't finish indexing some sources/)).toBeInTheDocument();
    expect(screen.getByText(/Showing 412 articles imported so far/)).toBeInTheDocument();
  });
});

describe("IngestionTracker — mode + dismissibility", () => {
  it("24. wizard mode: NO dismiss button on done state (persistent through wizard steps)", () => {
    mockHookReturn.mockReturnValue(
      status({ status: "done", total_articles: 660 }),
    );
    render(<IngestionTracker mode="wizard" />, { wrapper: Wrapper });
    expect(screen.queryByLabelText(/Dismiss/)).toBeNull();
  });

  it("25. dashboard mode: dismiss button on done; click hides + persists to localStorage", () => {
    mockHookReturn.mockReturnValue(
      status({ status: "done", total_articles: 660 }),
    );
    const { container } = render(<IngestionTracker mode="dashboard" />, {
      wrapper: Wrapper,
    });
    const btn = screen.getByLabelText(/Dismiss/);
    fireEvent.click(btn);
    expect(container.firstChild).toBeNull();
    const persisted = localStorage.getItem(_internal.dismissKeyFor("user-1"));
    expect(persisted).toBeTruthy();
    expect(JSON.parse(persisted!).dismissed).toBe(true);
  });

  it("26. dashboard mode: pre-dismissed state from localStorage → renders nothing on done", () => {
    _internal.writeDismissed("user-1", true);
    mockHookReturn.mockReturnValue(
      status({ status: "done", total_articles: 660 }),
    );
    const { container } = render(<IngestionTracker mode="dashboard" />, {
      wrapper: Wrapper,
    });
    expect(container.firstChild).toBeNull();
  });

  it("27. wizard mode: ignores localStorage dismissed state (always renders done)", () => {
    _internal.writeDismissed("user-1", true);
    mockHookReturn.mockReturnValue(
      status({ status: "done", total_articles: 660 }),
    );
    render(<IngestionTracker mode="wizard" />, { wrapper: Wrapper });
    expect(screen.getByTestId("ingestion-tracker-done")).toBeInTheDocument();
  });

  it("28. localStorage corruption on read → Sentry breadcrumb, treat as not-dismissed", () => {
    localStorage.setItem(_internal.dismissKeyFor("user-1"), "{not-valid-json");
    mockHookReturn.mockReturnValue(
      status({ status: "done", total_articles: 660 }),
    );
    render(<IngestionTracker mode="dashboard" />, { wrapper: Wrapper });
    expect(screen.getByTestId("ingestion-tracker-done")).toBeInTheDocument();
    expect(vi.mocked(Sentry.addBreadcrumb)).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "ingestion-tracker",
        message: expect.stringContaining("Corrupt"),
      }),
    );
  });

  it("29. localStorage quota on write → Sentry breadcrumb, dismiss still works in-session", () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    mockHookReturn.mockReturnValue(
      status({ status: "done", total_articles: 660 }),
    );
    const { container } = render(<IngestionTracker mode="dashboard" />, {
      wrapper: Wrapper,
    });
    fireEvent.click(screen.getByLabelText(/Dismiss/));
    // Still hides in-session even though persistence failed.
    expect(container.firstChild).toBeNull();
    expect(vi.mocked(Sentry.addBreadcrumb)).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "ingestion-tracker",
        message: expect.stringContaining("quota"),
      }),
    );
    setItemSpy.mockRestore();
  });

  it("30. dismissed publisher sees tracker re-appear when status flips to active", () => {
    // Re-render with the same component to simulate a status change.
    _internal.writeDismissed("user-1", true);
    mockHookReturn.mockReturnValue(
      status({ status: "done", total_articles: 660 }),
    );
    const { container, rerender } = render(
      <IngestionTracker mode="dashboard" />,
      { wrapper: Wrapper },
    );
    expect(container.firstChild).toBeNull();

    // Status flips back to active — auto-undismiss.
    mockHookReturn.mockReturnValue(
      status({
        status: "active",
        total_articles: 700,
        pending_sources: [
          { id: "s1", url: "u", source_type: null, archive_status: "running" },
        ],
      }),
    );
    rerender(<IngestionTracker mode="dashboard" />);
    expect(screen.getByTestId("ingestion-tracker-active")).toBeInTheDocument();
    // localStorage flag cleared too.
    expect(localStorage.getItem(_internal.dismissKeyFor("user-1"))).toBeNull();
  });
});
