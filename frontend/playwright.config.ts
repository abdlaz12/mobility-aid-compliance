import { defineConfig } from "@playwright/test";

// PLAYWRIGHT_CHROMIUM_PATH lets a machine with a preinstalled Chromium skip "npx playwright install chromium".
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "off",
    launchOptions: { executablePath },
  },
  webServer: {
    command: "npx vite --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
