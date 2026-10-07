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
    env: {
      HOST: "127.0.0.1",
      PORT: "3100",
      RAPIDAPI_KEY: "",
    },
    reuseExistingServer: false,
  },
});
