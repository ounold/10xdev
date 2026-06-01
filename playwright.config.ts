import { defineConfig, devices } from "@playwright/test";

import { loadE2EEnv } from "./tests/e2e/support/env";

loadE2EEnv();

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4321";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
