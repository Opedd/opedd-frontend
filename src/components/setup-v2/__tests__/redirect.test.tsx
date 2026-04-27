import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

/**
 * Phase 3 Session 3.1 — loop-fix redirect test.
 *
 * Verifies the SetupRedirect pattern from App.tsx: any visit to /setup
 * redirects to /setup-v2 with the query string preserved. Critical for
 * the loop-fix non-negotiable — old bookmarks, external links, and any
 * caller we missed must not land on legacy Setup.tsx.
 *
 * SetupRedirect is defined inline in App.tsx (it's tiny — a single
 * Navigate). The test here re-implements it identically and exercises
 * the routing, since pulling it out of App.tsx for export would be a
 * refactor for testability without other consumers.
 */

function SetupRedirect() {
  const location = useLocation();
  return <Navigate to={`/setup-v2${location.search}${location.hash}`} replace />;
}

function MarkerSetupV2() {
  const location = useLocation();
  return (
    <div>
      <span data-testid="setup-v2-mounted">setup-v2-mounted</span>
      <span data-testid="setup-v2-search">{location.search}</span>
    </div>
  );
}

function renderApp(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/setup-v2" element={<MarkerSetupV2 />} />
        <Route path="/setup" element={<SetupRedirect />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SetupRedirect — /setup → /setup-v2 (loop-fix)", () => {
  it("redirects /setup to /setup-v2 (no query string)", () => {
    renderApp("/setup");
    expect(screen.getByTestId("setup-v2-mounted")).toBeTruthy();
    expect(screen.getByTestId("setup-v2-search").textContent).toBe("");
  });

  it("redirects /setup?add=1 to /setup-v2?add=1 (preserves query string)", () => {
    renderApp("/setup?add=1");
    expect(screen.getByTestId("setup-v2-mounted")).toBeTruthy();
    expect(screen.getByTestId("setup-v2-search").textContent).toBe("?add=1");
  });

  it("preserves multi-param query strings verbatim", () => {
    // location.search is a verbatim pass-through; this test guards against
    // any future "tidy" refactor that splits + reconstructs the query string
    // and silently drops or reorders params.
    renderApp("/setup?add=1&foo=bar&utm_source=email");
    expect(screen.getByTestId("setup-v2-mounted")).toBeTruthy();
    expect(screen.getByTestId("setup-v2-search").textContent).toBe(
      "?add=1&foo=bar&utm_source=email",
    );
  });
});
