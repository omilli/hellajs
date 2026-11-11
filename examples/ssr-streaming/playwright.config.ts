import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 20_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    channel: "chrome",
    baseURL: "http://localhost:4315",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 4315 --strictPort --force",
    url: "http://localhost:4315",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
