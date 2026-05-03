import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/components/dashboard/DashboardSkeleton", () => ({
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton" />,
}));

import { ProtectedRoute } from "./ProtectedRoute";

beforeEach(() => {
  vi.clearAllMocks();
});

function renderAt(initialPath: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path={initialPath} element={element} />
        <Route path="/login" element={<div data-testid="login-page" />} />
        <Route
          path="/buyer/signup"
          element={<div data-testid="buyer-signup-page" />}
        />
        <Route path="/protected" element={<div data-testid="protected" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("redirects unauthed users to /login by default", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    renderAt(
      "/protected-source",
      <ProtectedRoute>
        <div data-testid="children" />
      </ProtectedRoute>,
    );
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.queryByTestId("children")).toBeNull();
  });

  it("redirects unauthed users to unauthedRedirect when provided (buyer route)", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    renderAt(
      "/protected-source",
      <ProtectedRoute unauthedRedirect="/buyer/signup">
        <div data-testid="children" />
      </ProtectedRoute>,
    );
    expect(screen.getByTestId("buyer-signup-page")).toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).toBeNull();
    expect(screen.queryByTestId("children")).toBeNull();
  });

  it("renders children when the user is authed", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "x@example.com" },
      isLoading: false,
    });
    renderAt(
      "/protected-source",
      <ProtectedRoute>
        <div data-testid="children" />
      </ProtectedRoute>,
    );
    expect(screen.getByTestId("children")).toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).toBeNull();
  });
});
