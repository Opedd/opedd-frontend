import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SubstackImportCard } from "./SubstackImportCard";

// Mocks
const mockGetAccessToken = vi.fn<() => Promise<string | null>>();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ getAccessToken: mockGetAccessToken }),
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@sentry/react", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@/lib/constants", () => ({
  EXT_SUPABASE_REST: "https://test.supabase.co",
  EXT_ANON_KEY: "test-anon-key",
}));

// Stub the substack logo asset import.
vi.mock("@/assets/platforms/substack.svg", () => ({ default: "substack.svg" }));

const originalFetch = globalThis.fetch;

function makeFile(name = "export.zip", size = 100): File {
  const blob = new Blob(["x".repeat(size)], { type: "application/zip" });
  return new File([blob], name, { type: "application/zip" });
}

function selectFile(file: File) {
  const fileInput = screen
    .getByText(/Choose export\.zip/i)
    .closest("label")
    ?.querySelector("input[type='file']") as HTMLInputElement;
  if (!fileInput) throw new Error("file input not found");
  fireEvent.change(fileInput, { target: { files: [file] } });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAccessToken.mockResolvedValue("test-token-abc");
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("SubstackImportCard — render baseline", () => {
  it("renders Substack branding + instructions toggle + file picker + Import button", () => {
    render(<SubstackImportCard />);
    expect(screen.getByText(/Import from Substack/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Import/i })).toBeInTheDocument();
    expect(screen.getByText(/Choose export\.zip/i)).toBeInTheDocument();
  });

  it("Import button is disabled until a file is selected", () => {
    render(<SubstackImportCard />);
    const importBtn = screen.getByRole("button", { name: /Import/i });
    expect(importBtn).toBeDisabled();
  });

  it("Import button enables once file is selected", () => {
    render(<SubstackImportCard />);
    selectFile(makeFile());
    const importBtn = screen.getByRole("button", { name: /Import/i });
    expect(importBtn).not.toBeDisabled();
  });
});

describe("SubstackImportCard — handleImport success path", () => {
  it("on successful 200 + envelope-success: shows banner + fires success toast + onImportComplete callback", async () => {
    const onImportComplete = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { imported: 1, updated: 20, errored: 0, total_posts: 21 },
      }),
    }) as never;

    render(<SubstackImportCard onImportComplete={onImportComplete} />);
    selectFile(makeFile());
    fireEvent.click(screen.getByRole("button", { name: /Import/i }));

    await waitFor(() => {
      expect(onImportComplete).toHaveBeenCalledOnce();
    });
    // Toast surfaces success with total = imported + updated
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Import complete: 21 article"),
      }),
    );
    // Banner renders
    expect(screen.getByText(/21 articles processed/i)).toBeInTheDocument();
  });

  it("envelope-unwrap fix: reads json.data.imported, not json.imported (top-level)", async () => {
    const onImportComplete = vi.fn();
    // Backend returns the success envelope shape; pre-fix code read top-level keys (always 0).
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { imported: 5, updated: 10, errored: 0, total_posts: 15 },
        // intentionally also at top-level to verify we DON'T read these (would be undefined per real backend):
        imported: 999,
      }),
    }) as never;

    render(<SubstackImportCard onImportComplete={onImportComplete} />);
    selectFile(makeFile());
    fireEvent.click(screen.getByRole("button", { name: /Import/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining("15 article") }),
      );
    });
    // The 999 top-level shouldn't leak through
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining("999") }),
    );
  });

  it("singular vs plural: 1 article processed renders 'article' not 'articles'", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { imported: 1, updated: 0, errored: 0, total_posts: 1 },
      }),
    }) as never;

    render(<SubstackImportCard />);
    selectFile(makeFile());
    fireEvent.click(screen.getByRole("button", { name: /Import/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Import complete: 1 article" }),
      );
    });
  });

  it("shows errored count in toast description when errored > 0", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { imported: 18, updated: 0, errored: 3, total_posts: 21 },
      }),
    }) as never;

    render(<SubstackImportCard />);
    selectFile(makeFile());
    fireEvent.click(screen.getByRole("button", { name: /Import/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("18 article"),
          description: expect.stringContaining("3 article"),
        }),
      );
    });
  });
});

describe("SubstackImportCard — error paths", () => {
  it("PFQ-2-bis: null token triggers early return + auth toast (no fetch fired)", async () => {
    mockGetAccessToken.mockResolvedValue(null);
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as never;

    render(<SubstackImportCard />);
    selectFile(makeFile());
    fireEvent.click(screen.getByRole("button", { name: /Import/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Authentication required",
          variant: "destructive",
        }),
      );
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("backend non-OK + envelope error.string: surfaces error toast", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ success: false, error: "Invalid ZIP format" }),
    }) as never;

    render(<SubstackImportCard />);
    selectFile(makeFile());
    fireEvent.click(screen.getByRole("button", { name: /Import/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Import failed",
          description: "Invalid ZIP format",
          variant: "destructive",
        }),
      );
    });
  });

  it("backend non-OK + envelope error.object: extracts error.message", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: { code: "INVALID_PAYLOAD", message: "ZIP missing posts.csv" },
      }),
    }) as never;

    render(<SubstackImportCard />);
    selectFile(makeFile());
    fireEvent.click(screen.getByRole("button", { name: /Import/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "ZIP missing posts.csv",
        }),
      );
    });
  });

  it("fetch reject: surfaces generic error toast", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network down")) as never;

    render(<SubstackImportCard />);
    selectFile(makeFile());
    fireEvent.click(screen.getByRole("button", { name: /Import/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Import failed",
          description: "Network down",
          variant: "destructive",
        }),
      );
    });
  });

  it("uploading state resets in finally block (after error)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("test")) as never;

    render(<SubstackImportCard />);
    selectFile(makeFile());
    fireEvent.click(screen.getByRole("button", { name: /Import/i }));

    // After the async error settles, button should be re-enabled (uploading=false)
    await waitFor(() => {
      const importBtn = screen.getByRole("button", { name: /Import/i });
      expect(importBtn).not.toBeDisabled();
    });
  });
});
