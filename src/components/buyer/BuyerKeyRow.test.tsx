import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BuyerKeyRow } from "./BuyerKeyRow";
import type { MaskedBuyerKey } from "@/lib/buyerApi";

function makeKey(overrides: Partial<MaskedBuyerKey> = {}): MaskedBuyerKey {
  return {
    id: "key-uuid",
    key_prefix: "abc123def456",
    name: "Production",
    environment: "live",
    scopes: [],
    last_used_at: null,
    revoked_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("BuyerKeyRow", () => {
  it("never renders the full key — only the prefix", () => {
    render(<BuyerKeyRow k={makeKey()} onRevokeClick={vi.fn()} isRevoking={false} />);
    const prefix = screen.getByTestId("key-prefix").textContent ?? "";
    expect(prefix).toContain("opedd_buyer_live_abc123def456…");
    // Sanity: no longer-than-prefix tokens leak into the DOM
    expect(prefix.length).toBeLessThan(40);
  });

  it("shows the live badge for live environment keys", () => {
    render(<BuyerKeyRow k={makeKey({ environment: "live" })} onRevokeClick={vi.fn()} isRevoking={false} />);
    expect(screen.getByText("live")).toBeTruthy();
  });

  it("shows the test badge for test environment keys", () => {
    render(<BuyerKeyRow k={makeKey({ environment: "test" })} onRevokeClick={vi.fn()} isRevoking={false} />);
    expect(screen.getByText("test")).toBeTruthy();
  });

  it("calls onRevokeClick with the key when the revoke button is pressed", () => {
    const onRevoke = vi.fn();
    const k = makeKey();
    render(<BuyerKeyRow k={k} onRevokeClick={onRevoke} isRevoking={false} />);
    fireEvent.click(screen.getByTestId("revoke-btn"));
    expect(onRevoke).toHaveBeenCalledWith(k);
  });

  it("hides the revoke button for already-revoked keys + shows the revoked badge", () => {
    render(
      <BuyerKeyRow
        k={makeKey({ revoked_at: new Date().toISOString() })}
        onRevokeClick={vi.fn()}
        isRevoking={false}
      />,
    );
    expect(screen.queryByTestId("revoke-btn")).toBeNull();
    expect(screen.getByText("revoked")).toBeTruthy();
  });

  it("disables the revoke button while a revoke call is in-flight", () => {
    render(<BuyerKeyRow k={makeKey()} onRevokeClick={vi.fn()} isRevoking={true} />);
    const btn = screen.getByTestId("revoke-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
