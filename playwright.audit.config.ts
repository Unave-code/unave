import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

/**
 * The launch audit: screenshots and automated checks of every customer route,
 * written to .lavish/audit/ (git-ignored). Not part of `pnpm test`.
 * Run: pnpm exec playwright test --config=playwright.audit.config.ts
 */
export default defineConfig({
  testDir: './tests/audit',
  testMatch: /.*\.audit\.spec\.ts/,
  timeout: 180_000,
  workers: 2,
  reporter: 'line',
  use: { baseURL: 'http://localhost:3000' },
  projects: [
    {
      name: 'phone',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, browserName: 'chromium' },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'node scripts/e2e-web-server.mjs',
    reuseExistingServer: true,
    timeout: 300_000,
    url: 'http://localhost:3000',
  },
})
