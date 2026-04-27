import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { StripeDisabledReasonDisplay } from "../StripeDisabledReasonDisplay";

/**
 * Phase 3 Session 3.5 — StripeDisabledReasonDisplay parser tests.
 *
 * Pure-component tests (no hooks, no router, no API). Asserts on
 * the parser output produced by the verbatim port from legacy
 * Setup.tsx:1441-1447.
 */

describe("StripeDisabledReasonDisplay — parser output", () => {
  it("parses currently_due: prefix + multiple fields → 'Missing: <space-separated list>'", () => {
    render(
      <StripeDisabledReasonDisplay reason="currently_due:individual.address.city,individual.dob.day" />,
    );
    expect(screen.getByText(/Stripe is waiting on one more step/i)).toBeTruthy();
    expect(
      screen.getByText("Missing: individual address city, individual dob day"),
    ).toBeTruthy();
  });

  it("parses currently_due: prefix + single field → 'Missing: <single>'", () => {
    render(
      <StripeDisabledReasonDisplay reason="currently_due:individual.first_name" />,
    );
    expect(screen.getByText("Missing: individual first name")).toBeTruthy();
  });

  it("non-currently_due reason renders dot/underscore-replaced verbatim", () => {
    render(<StripeDisabledReasonDisplay reason="requirements.past_due" />);
    expect(screen.getByText("requirements past due")).toBeTruthy();
  });

  it("null reason renders nothing (component returns null)", () => {
    const { container } = render(<StripeDisabledReasonDisplay reason={null} />);
    // No status element, no warning icon — entire component is null.
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
