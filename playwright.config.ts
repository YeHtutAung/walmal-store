import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(__dirname, '.env.test.local') })

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
  // Two servers: Spring Boot backend + Next.js frontend.
  //
  // Backend: activates the "test" Spring profile so application-test.yml is
  // loaded, giving effectively-unlimited rate limits (100 000 req/min) so
  // sequential E2E requests never hit a 429.  reuseExistingServer:true lets
  // warm restarts skip the 3-minute JAR startup.  A pre-running server that
  // was NOT started with the test profile (e.g. a dev or k6 session on :8080)
  // is detected by global-setup via the /actuator/info profile marker and the
  // run fails fast with instructions, instead of flaking with 429s mid-suite.
  //
  // Frontend: always starts a FRESH Next.js process on port 3001
  // (reuseExistingServer:false) so the STRIPE_SECRET_KEY from .env.test.local
  // is guaranteed to be in the subprocess environment.  Using port 3001 avoids
  // colliding with a dev server on the default port 3000.
  webServer: [
    {
      command: [
        'docker compose -f ../walmal/docker-compose.yml up -d --wait',
        'postgres redis rabbitmq minio mailhog',
        '&&',
        // -Dspring.profiles.active=test loads application-test.yml from the JAR:
        // effectively-unlimited rate limits, CORS incl. port 3001, and the
        // info.walmal.profile=test marker that global-setup verifies before any
        // test runs.  The test profile is the single source of truth — no
        // redundant -D overrides, so a stale JAR fails fast instead of being
        // silently masked.  Rebuild with:
        //   cd ../walmal && ./mvnw -pl walmal-app -am -DskipTests clean package
        'java -Dspring.profiles.active=test',
        '-jar ../walmal/walmal-app/target/walmal-app-0.1.0-SNAPSHOT.jar',
      ].join(' '),
      url: 'http://localhost:8080/actuator/info',
      reuseExistingServer: true,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev -- --port 3001',
      url: 'http://localhost:3001',
      // Never reuse: a running dev server has .env.local placeholder Stripe keys.
      // A fresh process started here receives the real test keys via env: below.
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        NEXT_PUBLIC_API_URL:                  process.env.NEXT_PUBLIC_API_URL                  ?? 'http://localhost:8080/api/v1',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:   process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY   ?? '',
        STRIPE_SECRET_KEY:                    process.env.STRIPE_SECRET_KEY                    ?? '',
      },
    },
  ],
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
