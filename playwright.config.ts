import { defineConfig } from "@playwright/test";
import { BASE_URL, PORT, testEnv } from "./tests/e2e/env";

/** Runs against a production build and a throwaway local database (garvhem_test). */
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    // Uses installed Google Chrome. Without it: npx playwright install chromium && PW_CHANNEL= npm run test:e2e
    channel: process.env.PW_CHANNEL ?? "chrome",
    trace: "retain-on-failure",
    viewport: { width: 1360, height: 850 },
    locale: "en-GB",
  },
  webServer: {
    command: process.env.E2E_SKIP_BUILD
      ? `npx next start -p ${PORT}`
      : `npm run build && npx next start -p ${PORT}`,
    url: `${BASE_URL}/api/auth/expired`,
    ignoreHTTPSErrors: true,
    timeout: 300_000,
    reuseExistingServer: false,
    env: testEnv,
    stdout: "ignore",
    stderr: "pipe",
  },
});
