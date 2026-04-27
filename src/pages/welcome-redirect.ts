// src/pages/welcome-redirect.ts
//
// Pure decision helper for the Session 1.9 Welcome trigger rewire.
// Given the wizard hook state + the publisher's profile-loaded flag +
// welcome_completed_at, decide whether Dashboard should redirect the
// publisher to /welcome.
//
// Extracted from Dashboard.tsx for unit testability — mirrors the
// per-function helper-extraction pattern used by welcome-publisher/
// decide.ts (Bug 3 Commit 5). Dashboard imports this and gates a
// useEffect's navigate() call on it.
//
// Returns true ONLY when ALL of:
//   - wizard hook has finished loading (no isLoading or error state)
//   - profile-loaded flag is true (Dashboard's loadProfile resolved)
//   - setup_state is exactly 'verified' (terminal happy state)
//   - welcome_completed_at is null (publisher has never completed Welcome)
//
// False on any of: still loading, error state, non-verified setup_state,
// already-completed welcome.

export interface WelcomeRedirectInput {
  isLoading: boolean;
  hasError: boolean;
  setupState: string | null | undefined;
  profileLoaded: boolean;
  welcomeCompletedAt: string | null;
}

export function shouldRedirectToWelcome(input: WelcomeRedirectInput): boolean {
  if (input.isLoading) return false;
  if (input.hasError) return false;
  if (!input.profileLoaded) return false;
  if (input.setupState !== "verified") return false;
  if (input.welcomeCompletedAt) return false;
  return true;
}
