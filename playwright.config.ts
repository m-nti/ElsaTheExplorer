import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  /**
   * Four, not "100%": this suite drives four engines over a five-by-five card
   * matrix with full-page screenshots, and the card spec alone is 16 tests per
   * project. On a 4-core host the default oversubscribes and the run ends in
   * 30 s teardown timeouts that look like defects but are load. CI already uses
   * four, so local and CI now mean the same thing.
   */
  workers: 4,
  /**
   * 60 s, not the 30 s default. The *tests* run in ~3 s; the binding constraint
   * is context teardown, which Playwright bounds by the same clock and which
   * has to encode and ditch a video per test (`retain-on-failure` records
   * every one). Sixteen concurrent browsers on a four-core host therefore end
   * in "Tearing down context exceeded the test timeout" — a teardown
   * measurement reported as a failure. The bumped clock only bounds a
   * pathological hang; it does not slow a passing run.
   */
  timeout: 60_000,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "reports/playwright-html" }],
    ["junit", { outputFile: "reports/playwright.xml" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    colorScheme: "dark",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    serviceWorkers: "block",
  },
  expect: {
    timeout: 5_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  webServer: {
    command: "npm run preview",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
  ],
});
