import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Files run in parallel (4 at a time), tests within a file stay sequential.
  // Each test creates its own isolated Supabase user via createTestUser(), so
  // cross-file collisions are impossible. Within-file ordering is preserved
  // because some specs set up shared state in beforeAll and walk through
  // dependent steps (onboarding, lifecycle).
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0, // allow one flake retry in CI only
  workers: 4,
  timeout: 30_000,     // 30s per test — fail fast on hangs
  expect: { timeout: 10_000 },

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080",
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
    // Abort any navigation/API call that takes > 10s
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
