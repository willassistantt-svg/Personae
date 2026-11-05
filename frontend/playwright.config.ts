import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end and screen tests against a running stack (docker compose up). Base URL: E2E_BASE_URL or http://localhost.
 * Uses the local seed admin; never point it at production.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]],
  outputDir: "e2e-results",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost",
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 820 } } },
    { name: "mobile", testIgnore: /chat-api/, use: { ...devices["iPhone 13"], browserName: "chromium" } },
    {
      name: "small",
      testMatch: /chat-layout/,
      use: { ...devices["Galaxy S9+"], viewport: { width: 360, height: 640 }, browserName: "chromium" },
    },
  ],
});
