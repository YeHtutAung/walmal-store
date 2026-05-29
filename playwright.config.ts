import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(__dirname, '.env.test.local') })

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Ensures the Next.js server started by Playwright has the Stripe keys from
  // .env.test.local.  When a server is already running on :3000 locally,
  // reuseExistingServer skips the start — in that case the server must have
  // been started with these vars set (or via `npm run test:e2e` from cold).
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      NEXT_PUBLIC_API_URL:                  process.env.NEXT_PUBLIC_API_URL                  ?? 'http://localhost:8080/api/v1',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:   process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY   ?? '',
      STRIPE_SECRET_KEY:                    process.env.STRIPE_SECRET_KEY                    ?? '',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
})
