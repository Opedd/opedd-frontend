import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { OneTimeKeyModal } from "./OneTimeKeyModal";

describe("OneTimeKeyModal", () => {
  let mockClipboard: { writeText: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockClipboard = { writeText: vi.fn(async () => {}) };
    Object.defineProperty(navigator, "clipboard", {
      value: mockClipboard,
      writable: true,
      configurable: true,
    });
  });

  it("renders the full key when fullKey is provided", () => {
    render(<OneTimeKeyModal fullKey="opedd_buyer_live_abc123" environment="live" onClose={vi.fn()} />);
    expect(screen.getByTestId("full-key").textContent).toBe("opedd_buyer_live_abc123");
  });

  it("dismiss button is disabled until the confirm checkbox is checked", () => {
    render(<OneTimeKeyModal fullKey="opedd_buyer_live_abc123" environment="live" onClose={vi.fn()} />);
    const dismissBtn = screen.getByTestId("dismiss-btn") as HTMLButtonElement;
    expect(dismissBtn.disabled).toBe(true);

    const checkbox = screen.getByTestId("confirm-checkbox");
    fireEvent.click(checkbox);
    expect(dismissBtn.disabled).toBe(false);
  });

  it("calls onClose only after the user confirms via checkbox", () => {
    const onClose = vi.fn();
    render(<OneTimeKeyModal fullKey="opedd_buyer_live_abc123" environment="live" onClose={onClose} />);
    const dismissBtn = screen.getByTestId("dismiss-btn") as HTMLButtonElement;

    // Pre-checkbox: dismiss is disabled — clicking does nothing
    fireEvent.click(dismissBtn);
    expect(onClose).not.toHaveBeenCalled();

    // Tick the checkbox, then dismiss
    fireEvent.click(screen.getByTestId("confirm-checkbox"));
    fireEvent.click(dismissBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("copy button writes the full key to the clipboard", async () => {
    render(<OneTimeKeyModal fullKey="opedd_buyer_test_xyz789" environment="test" onClose={vi.fn()} />);
    const copyBtn = screen.getByTestId("copy-key-btn");
    fireEvent.click(copyBtn);
    // The clipboard call is awaited inside the handler; flush microtasks
    await Promise.resolve();
    await Promise.resolve();
    expect(mockClipboard.writeText).toHaveBeenCalledWith("opedd_buyer_test_xyz789");
  });

  it("does NOT render when fullKey is null (closed state)", () => {
    render(<OneTimeKeyModal fullKey={null} environment="live" onClose={vi.fn()} />);
    expect(screen.queryByTestId("full-key")).toBeNull();
    expect(screen.queryByTestId("dismiss-btn")).toBeNull();
  });

  it("displays the correct environment label and key length", () => {
    const fullKey = "opedd_buyer_test_abcdef"; // 23 chars
    render(<OneTimeKeyModal fullKey={fullKey} environment="test" onClose={vi.fn()} />);
    // Test label + length should appear in the env strip
    expect(screen.getByText(/Test key/)).toBeTruthy();
    expect(screen.getByText(new RegExp(`${fullKey.length} chars`))).toBeTruthy();
  });
});
