import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";

const PORT = 3100;
export const E2E_DB = "./data/e2e/funke-e2e.db";
// Für jeden Lauf ein frisches Geheimnis, nie im Repository.
const secret = process.env.E2E_AUTH_SECRET ?? randomBytes(32).toString("base64url");
process.env.E2E_AUTH_SECRET = secret;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "api", testMatch: /security\.spec\.ts/ },
    { name: "mobil-390", testIgnore: /security\.spec\.ts/, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
    { name: "desktop-1440", testIgnore: /security\.spec\.ts/, use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    // Eigene Wegwerf-Datenbank: der Lauf berührt keine lokalen oder produktiven Daten.
    command: `rm -rf ./data/e2e && pnpm db:migrate && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}/anmelden`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_PATH: E2E_DB,
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
      BETTER_AUTH_SECRET: secret,
      FUNKE_DISABLE_RATE_LIMIT: "1",
    },
  },
});
