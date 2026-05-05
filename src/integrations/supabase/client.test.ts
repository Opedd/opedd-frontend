import { describe, it, expect } from "vitest";
import { shouldUseImplicitFlow } from "./client";

/**
 * KI #100 (closed 2026-05-05 Phase 5.11-γ Tier 2) — Safari Private mode
 * PKCE bug remediation via UA-based detection. Tests anchor the
 * detection regex against canonical UA strings for major browsers.
 *
 * Detection regex: `/^((?!chrome|android).)*safari/i` — matches strings
 * where 'safari' appears with no 'chrome' or 'android' anywhere before
 * it. Negative-lookahead at every char position.
 */

describe("shouldUseImplicitFlow (KI #100)", () => {
  // ─── PKCE cases (non-Safari → implicit=false) ────────────────

  it("Chrome on macOS → PKCE (false)", () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(shouldUseImplicitFlow(ua)).toBe(false);
  });

  it("Chrome on Windows → PKCE", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(shouldUseImplicitFlow(ua)).toBe(false);
  });

  it("Chrome on Linux → PKCE", () => {
    const ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(shouldUseImplicitFlow(ua)).toBe(false);
  });

  it("Chrome on Android → PKCE", () => {
    const ua = "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    expect(shouldUseImplicitFlow(ua)).toBe(false);
  });

  it("Firefox on macOS → PKCE", () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0";
    expect(shouldUseImplicitFlow(ua)).toBe(false);
  });

  it("Firefox on Windows → PKCE", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0";
    expect(shouldUseImplicitFlow(ua)).toBe(false);
  });

  it("Edge (Chromium) on Windows → PKCE (Chrome present in UA)", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    expect(shouldUseImplicitFlow(ua)).toBe(false);
  });

  it("Edge legacy on Windows → PKCE (Chrome present in compat string)", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36 Edge/15.15063";
    expect(shouldUseImplicitFlow(ua)).toBe(false);
  });

  it("Brave (Chromium) on macOS → PKCE", () => {
    // Brave UA mirrors Chrome
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(shouldUseImplicitFlow(ua)).toBe(false);
  });

  // ─── Implicit cases (Safari + iOS WebKit → implicit=true) ──

  it("Safari on macOS → implicit (true)", () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15";
    expect(shouldUseImplicitFlow(ua)).toBe(true);
  });

  it("Safari on iOS → implicit", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
    expect(shouldUseImplicitFlow(ua)).toBe(true);
  });

  it("Safari on iPadOS → implicit", () => {
    const ua = "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
    expect(shouldUseImplicitFlow(ua)).toBe(true);
  });

  it("iOS Chrome (CriOS, runs WebKit) → implicit (correct — same Private mode storage isolation)", () => {
    // Apple's iOS policy: all browsers run WebKit. CriOS shares Safari
    // Private mode behavior; treating it as Safari-equivalent is correct.
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1";
    expect(shouldUseImplicitFlow(ua)).toBe(true);
  });

  it("iOS Firefox (FxiOS, runs WebKit) → implicit", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/121.0 Mobile/15E148 Safari/605.1.15";
    expect(shouldUseImplicitFlow(ua)).toBe(true);
  });

  it("iOS Edge (EdgiOS, runs WebKit) → implicit", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 EdgiOS/120.0.0.0 Mobile/15E148 Safari/604.1";
    expect(shouldUseImplicitFlow(ua)).toBe(true);
  });

  // ─── Defensive cases ─────────────────────────────────────────

  it("undefined UA → PKCE (default safe)", () => {
    expect(shouldUseImplicitFlow(undefined)).toBe(false);
  });

  it("null UA → PKCE", () => {
    expect(shouldUseImplicitFlow(null)).toBe(false);
  });

  it("empty string UA → PKCE", () => {
    expect(shouldUseImplicitFlow("")).toBe(false);
  });

  it("garbage UA without Safari token → PKCE", () => {
    expect(shouldUseImplicitFlow("UnknownBrowser/1.0")).toBe(false);
  });

  it("UA with 'safari' lowercase mid-string but no Chrome → implicit (regex case-insensitive)", () => {
    // Defensive: if a UA puts Safari token in unusual casing, regex still matches
    expect(shouldUseImplicitFlow("Mozilla/5.0 (something) Custom safari/1.0")).toBe(true);
  });
});
