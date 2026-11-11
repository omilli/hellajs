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
    baseURL: "http://localhost:4317",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build && node dist/server.mjs",
    url: "http://localhost:4317",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { PORT: "4317" },
  },
});
