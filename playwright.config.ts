import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3100",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3100/api/health",
    env: { PORT: "3100", PLAYER_PROVIDER: "sportsdb", RAPIDAPI_KEY: "" },
    reuseExistingServer: false,
  },
});
