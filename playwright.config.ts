import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  /**
   * Two workers, not "100%": this suite opens four engines over a five-by-five
   * card matrix, and every context records a video that is encoded and ditched
   * at teardown. Sixteen concurrent contexts end in "Tearing down context
   * exceeded the test timeout" — a teardown measurement reported as a failure —
   * while the tests themselves take ~1.4 s each. Measured on this 4-core
   * Windows host: 4 workers → 6.1 min with 9-10 teardown failures; 2 workers →
   * 1.5 min, 64/64 green. Raise it only with a run to back it.
   */
  workers: 2,
  /**
   * 60 s, not the 30 s default: bounds teardown of a video-recording context
   * under load. Only a pathological hang runs into it; a passing run is unaffected.
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
