import { describe, it, expect } from "vitest";
import { shouldRedirectToWelcome } from "./welcome-redirect";

/**
 * Unit tests for the Session 1.9 Welcome trigger rewire decision helper.
 *
 * Pure-function tests; no Dashboard mounting, no React Query mocking, no
 * navigation mocking. Covers the redirect-true path (verified + first-
 * time) plus all the redirect-false paths (still loading, error state,
 * non-verified state, already-completed welcome).
 */

describe("shouldRedirectToWelcome — true path (verified + first-time)", () => {
  it("01. setup_state='verified' AND welcomeCompletedAt=null AND profileLoaded → redirect", () => {
    expect(
      shouldRedirectToWelcome({
        isLoading: false,
        hasError: false,
        setupState: "verified",
        profileLoaded: true,
        welcomeCompletedAt: null,
      }),
    ).toBe(true);
  });
});

describe("shouldRedirectToWelcome — false paths", () => {
  it("02. wizard hook still loading → no redirect", () => {
    expect(
      shouldRedirectToWelcome({
        isLoading: true,
        hasError: false,
        setupState: "verified",
        profileLoaded: true,
        welcomeCompletedAt: null,
      }),
    ).toBe(false);
  });

  it("03. wizard hook in error state → no redirect (don't navigate on stale data)", () => {
    expect(
      shouldRedirectToWelcome({
        isLoading: false,
        hasError: true,
        setupState: "verified",
        profileLoaded: true,
        welcomeCompletedAt: null,
      }),
    ).toBe(false);
  });

  it("04. profile not yet loaded → no redirect (welcomeCompletedAt may be stale)", () => {
    expect(
      shouldRedirectToWelcome({
        isLoading: false,
        hasError: false,
        setupState: "verified",
        profileLoaded: false,
        welcomeCompletedAt: null,
      }),
    ).toBe(false);
  });

  it("05. setup_state='in_setup' → no redirect (publisher mid-wizard)", () => {
    expect(
      shouldRedirectToWelcome({
        isLoading: false,
        hasError: false,
        setupState: "in_setup",
        profileLoaded: true,
        welcomeCompletedAt: null,
      }),
    ).toBe(false);
  });

  it("06. setup_state='connected' → no redirect (awaiting verification)", () => {
    expect(
      shouldRedirectToWelcome({
        isLoading: false,
        hasError: false,
        setupState: "connected",
        profileLoaded: true,
        welcomeCompletedAt: null,
      }),
    ).toBe(false);
  });

  it("07. setup_state='prospect' → no redirect (publisher hasn't started setup)", () => {
    expect(
      shouldRedirectToWelcome({
        isLoading: false,
        hasError: false,
        setupState: "prospect",
        profileLoaded: true,
        welcomeCompletedAt: null,
      }),
    ).toBe(false);
  });

  it("08. setup_state='suspended' → no redirect", () => {
    expect(
      shouldRedirectToWelcome({
        isLoading: false,
        hasError: false,
        setupState: "suspended",
        profileLoaded: true,
        welcomeCompletedAt: null,
      }),
    ).toBe(false);
  });

  it("09. welcomeCompletedAt set (string) → no redirect (already seen Welcome)", () => {
    expect(
      shouldRedirectToWelcome({
        isLoading: false,
        hasError: false,
        setupState: "verified",
        profileLoaded: true,
        welcomeCompletedAt: "2026-04-26T12:00:00Z",
      }),
    ).toBe(false);
  });

  it("10. setupState=null → no redirect (defensive against schema drift)", () => {
    expect(
      shouldRedirectToWelcome({
        isLoading: false,
        hasError: false,
        setupState: null,
        profileLoaded: true,
        welcomeCompletedAt: null,
      }),
    ).toBe(false);
  });
});
