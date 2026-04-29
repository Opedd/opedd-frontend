import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TokenDisplay } from "../TokenDisplay";

/**
 * Phase 4 Session 4.1.4 — TokenDisplay unit tests.
 *
 * Covers regression-protection for the load-bearing UX behaviors
 * (per design proposal §A.6 + § H.3 founder-approved scope):
 *   - Renders the token verbatim and the hint text.
 *   - Copy-to-clipboard fires navigator.clipboard.writeText with the
 *     full token string and surfaces success state for ~2s.
 *   - Countdown displays "Expires in Xh Ym" for the given expiresAt.
 *   - Regen button: enabled when no cooldown; disabled with countdown
 *     text "Regen available in Xh Ym" when regenCooldownUntil is in
 *     the future. (Founder-explicit refinement Q2 — countdown text on
 *     disabled state, not just a disabled button.)
 *
 * Not exhaustive — Session 4.1.5 adversarial probes own broader UX
 * coverage.
 */

// Capture original clipboard descriptor (if any) so afterEach can restore.
// jsdom doesn't ship Clipboard API by default → descriptor is undefined →
// we'll delete the property in cleanup.
const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard",
);

beforeEach(() => {
  // Pin time so countdown formatting is deterministic.
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-29T17:00:00.000Z"));

  // Mock navigator.clipboard for jsdom (default jsdom doesn't implement
  // the Clipboard API). Restored in afterEach so the mutation doesn't
  // leak into other test files sharing the worker.
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
  // Restore original descriptor (or delete the property if jsdom didn't
  // ship one). Prevents leaks into sibling test files in same worker.
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
  } else {
    delete (navigator as unknown as { clipboard?: unknown }).clipboard;
  }
});

describe("TokenDisplay — render", () => {
  it("renders the token value verbatim and the hint text", () => {
    render(
      <TokenDisplay
        token="opedd-verify-A8F9C2BX"
        expiresAt="2026-04-30T17:00:00.000Z"
        hintText="Paste this anywhere on your /about page."
      />,
    );

    expect(screen.getByTestId("token-display-value").textContent).toBe(
      "opedd-verify-A8F9C2BX",
    );
    expect(
      screen.getByText("Paste this anywhere on your /about page."),
    ).toBeInTheDocument();
  });

  it("renders the optional pasteTargetLabel below the token block when provided", () => {
    render(
      <TokenDisplay
        token="opedd-verify-A8F9C2BX"
        expiresAt="2026-04-30T17:00:00.000Z"
        hintText="Add this as a TXT record."
        pasteTargetLabel="_opedd-verify.example.com"
      />,
    );

    expect(screen.getByTestId("token-display-paste-target").textContent).toContain(
      "_opedd-verify.example.com",
    );
  });

  it("omits the pasteTargetLabel block when prop is null/undefined", () => {
    render(
      <TokenDisplay
        token="opedd-verify-A8F9C2BX"
        expiresAt="2026-04-30T17:00:00.000Z"
        hintText="hint"
      />,
    );

    expect(screen.queryByTestId("token-display-paste-target")).toBeNull();
  });
});

describe("TokenDisplay — copy", () => {
  it("clicking Copy invokes navigator.clipboard.writeText with the full token", async () => {
    const onCopy = vi.fn();
    render(
      <TokenDisplay
        token="opedd-verify-A8F9C2BX"
        expiresAt="2026-04-30T17:00:00.000Z"
        hintText="hint"
        onCopy={onCopy}
      />,
    );

    const button = screen.getByTestId("token-display-copy");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "opedd-verify-A8F9C2BX",
    );
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it("shows 'Copied' confirmation after successful copy then resets to 'Copy' after 2s", async () => {
    render(
      <TokenDisplay
        token="opedd-verify-A8F9C2BX"
        expiresAt="2026-04-30T17:00:00.000Z"
        hintText="hint"
      />,
    );

    const button = screen.getByTestId("token-display-copy");
    await act(async () => {
      fireEvent.click(button);
    });
    expect(button.textContent).toContain("Copied");

    // Advance fake timers past the 2s reset window.
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(button.textContent).toContain("Copy");
    expect(button.textContent).not.toContain("Copied");
  });
});

describe("TokenDisplay — expires-in countdown", () => {
  it("displays 'Expires in 24h' when expiresAt is exactly 24h ahead", () => {
    render(
      <TokenDisplay
        token="opedd-verify-A8F9C2BX"
        expiresAt="2026-04-30T17:00:00.000Z" // 24h from frozen now
        hintText="hint"
      />,
    );
    expect(screen.getByTestId("token-display-expires").textContent).toContain(
      "Expires in 24h",
    );
  });

  it("displays 'Expires in 2h 30m' when 2.5h ahead", () => {
    render(
      <TokenDisplay
        token="opedd-verify-A8F9C2BX"
        expiresAt="2026-04-29T19:30:00.000Z" // +2h 30min
        hintText="hint"
      />,
    );
    expect(screen.getByTestId("token-display-expires").textContent).toContain(
      "Expires in 2h 30m",
    );
  });

  it("displays 'expired' when expiresAt is in the past", () => {
    render(
      <TokenDisplay
        token="opedd-verify-A8F9C2BX"
        expiresAt="2026-04-29T16:00:00.000Z" // 1h before frozen now
        hintText="hint"
      />,
    );
    expect(screen.getByTestId("token-display-expires").textContent).toContain(
      "expired",
    );
  });

  it("countdown re-renders after 60s when fake time advances past the interval", () => {
    render(
      <TokenDisplay
        token="opedd-verify-A8F9C2BX"
        expiresAt="2026-04-29T18:00:00.000Z" // +1h
        hintText="hint"
      />,
    );
    expect(screen.getByTestId("token-display-expires").textContent).toContain("1h");

    // Advance time + flush the setInterval.
    act(() => {
      vi.advanceTimersByTime(70 * 60_000); // 70 minutes — should now be expired
    });
    expect(screen.getByTestId("token-display-expires").textContent).toContain(
      "expired",
    );
  });
});

describe("TokenDisplay — regen", () => {
  it("regen button invokes onRegen when enabled", () => {
    const onRegen = vi.fn();
    render(
      <TokenDisplay
        token="opedd-verify-A8F9C2BX"
        expiresAt="2026-04-30T17:00:00.000Z"
        hintText="hint"
        onRegen={onRegen}
      />,
    );

    const regen = screen.getByTestId("token-display-regen");
    expect(regen).not.toBeDisabled();
    fireEvent.click(regen);
    expect(onRegen).toHaveBeenCalledTimes(1);
  });

  it("regen button is disabled with countdown text when regenCooldownUntil is in the future", () => {
    const onRegen = vi.fn();
    render(
      <TokenDisplay
        token="opedd-verify-A8F9C2BX"
        expiresAt="2026-04-30T17:00:00.000Z"
        hintText="hint"
        onRegen={onRegen}
        regenCooldownUntil="2026-04-29T20:00:00.000Z" // 3h from frozen now
      />,
    );

    const regen = screen.getByTestId("token-display-regen");
    expect(regen).toBeDisabled();
    expect(regen.textContent).toContain("Regen available in 3h");
    fireEvent.click(regen);
    expect(onRegen).not.toHaveBeenCalled();
  });

  it("regen button is enabled when regenCooldownUntil is in the past", () => {
    render(
      <TokenDisplay
        token="opedd-verify-A8F9C2BX"
        expiresAt="2026-04-30T17:00:00.000Z"
        hintText="hint"
        onRegen={vi.fn()}
        regenCooldownUntil="2026-04-29T16:00:00.000Z" // 1h ago
      />,
    );

    const regen = screen.getByTestId("token-display-regen");
    expect(regen).not.toBeDisabled();
    expect(regen.textContent).toContain("Generate new token");
  });

  it("does not render regen button when onRegen prop is omitted", () => {
    render(
      <TokenDisplay
        token="opedd-verify-A8F9C2BX"
        expiresAt="2026-04-30T17:00:00.000Z"
        hintText="hint"
      />,
    );
    expect(screen.queryByTestId("token-display-regen")).toBeNull();
  });
});
