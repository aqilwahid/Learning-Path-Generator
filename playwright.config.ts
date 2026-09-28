import { defineConfig } from "@playwright/test";

/**
 * Uji end-to-end: dua server sekaligus
 *  - port 3101: mode lokal (tanpa database)
 *  - port 3102: mode cloud (penyimpanan memori + passcode) — mensimulasikan Upstash
 * Jalankan setelah `npm run build`:  npm run test:e2e
 * Bila Chromium Playwright tidak terpasang, set PW_CHROMIUM_PATH ke executable Chrome/Chromium.
 */
const LOCAL = 3101;
const CLOUD = 3102;
const launchOptions = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};

export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  expect: { timeout: 20_000 },
  outputDir: "test-results",
  reporter: [["list"]],
  workers: 1,
  use: { acceptDownloads: true, viewport: { width: 1366, height: 900 }, launchOptions },
  projects: [
    { name: "lokal", testMatch: /local\.spec\.ts/, use: { baseURL: `http://localhost:${LOCAL}` } },
    { name: "cloud", testMatch: /cloud\.spec\.ts/, use: { baseURL: `http://localhost:${CLOUD}` } },
  ],
  webServer: [
    {
      command: `npx next start -p ${LOCAL}`,
      port: LOCAL,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { STORAGE_DRIVER: "", INSTRUCTOR_PASSCODE: "", UPSTASH_REDIS_REST_URL: "", KV_REST_API_URL: "" },
    },
    {
      command: `npx next start -p ${CLOUD}`,
      port: CLOUD,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        STORAGE_DRIVER: "memory",
        INSTRUCTOR_PASSCODE: "uji-e2e-123",
        SESSION_SECRET: "rahasia-e2e",
        GENERATOR_API_KEY: "kunci-e2e",
        UPSTASH_REDIS_REST_URL: "",
        KV_REST_API_URL: "",
      },
    },
  ],
});
