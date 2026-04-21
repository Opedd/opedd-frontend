import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Files run in parallel (2 at a time), tests within a file stay sequential.
  // Each test creates its own isolated Supabase user via createTestUser(), so
  // cross-file collisions are impossible. Workers=4 was tried first but
  // occasionally tripped Supabase auth rate limits under concurrent user
  // creation; 2 is the sweet spot (still ~2x faster than sequential, zero
  // rate-limit flakes observed). Within-file ordering is preserved because
  // some specs set up shared state in beforeAll (onboarding, lifecycle).
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0, // one retry absorbs rare network blips; more would mask real bugs
  workers: 2,
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
