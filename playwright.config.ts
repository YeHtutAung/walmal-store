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
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
  // Two servers: Spring Boot backend + Next.js frontend.
  // The backend entry starts Docker Compose infrastructure and the Spring Boot JAR.
  // reuseExistingServer:true for the backend so warm restarts reuse a running instance.
  webServer: [
    {
      command: [
        'docker compose -f ../walmal/docker-compose.yml up -d --wait',
        'postgres redis rabbitmq minio mailhog',
        '&&',
        'java -Dwalmal.rate-limit.unauthenticated-limit=300 -jar ../walmal/walmal-app/target/walmal-app-0.1.0-SNAPSHOT.jar',
      ].join(' '),
      url: 'http://localhost:8080/actuator/info',
      reuseExistingServer: true,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev -- --webpack',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
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
