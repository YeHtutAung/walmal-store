/**
 * TC-E2E-021 to TC-E2E-028 — Authentication flows
 *
 * PREREQUISITES:
 *   - customer_test / TestPass123! exists with CUSTOMER role
 *   - admin_test / AdminPass123! exists with ADMIN role
 *
 * NOTE: The LoginForm uses a "Username" field (id="username"), not an email
 * field.  The seeded credentials use email-format usernames — ensure the
 * backend accepts them as the username identifier.
 */

import { test, expect } from '@playwright/test'
import { clearState, loginAsCustomer, CUSTOMER, ADMIN } from './helpers'

test.beforeEach(async ({ page }) => {
  await clearState(page)
})

// ---------------------------------------------------------------------------
// TC-E2E-021 — Register new account
// ---------------------------------------------------------------------------
test('TC-E2E-021 register new account redirects to /account', async ({ page }) => {
  // Use a unique username + email to avoid conflicts across test runs
  const ts = Date.now()
  await page.goto('/register')
  await page.waitForSelector('#username')
  await page.locator('#username').pressSequentially(`testuser${ts}`)
  await page.fill('#email', `testuser${ts}@example.com`)
  await page.fill('#password', 'TestPass123!')
  await page.click('button[type=submit]')
  await expect(page).toHaveURL(/\/account/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible()
})

// ---------------------------------------------------------------------------
// TC-E2E-022 — Register with existing email
// ---------------------------------------------------------------------------
test('TC-E2E-022 register with existing email shows error', async ({ page }) => {
  await page.goto('/register')
  await page.waitForSelector('#username')
  await page.locator('#username').pressSequentially('anynewusername')
  await page.fill('#email', CUSTOMER.email) // reuse the seeded account's email
  await page.fill('#password', 'TestPass123!')
  await page.click('button[type=submit]')
  await expect(
    page.getByText(/Email already registered/i),
  ).toBeVisible({ timeout: 10_000 })
})

// ---------------------------------------------------------------------------
// TC-E2E-023 — Login with valid credentials
// ---------------------------------------------------------------------------
test('TC-E2E-023 login with valid credentials redirects to /account', async ({ page }) => {
  await page.goto('/login')
  await page.waitForSelector('#username')
  await page.locator('#username').pressSequentially(CUSTOMER.username)
  await page.fill('#password', CUSTOMER.password)
  await page.click('button[type=submit]')
  await expect(page).toHaveURL(/\/account/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible()
})

// ---------------------------------------------------------------------------
// TC-E2E-024 — Login with wrong password
// ---------------------------------------------------------------------------
test('TC-E2E-024 login with wrong password shows error', async ({ page }) => {
  await page.goto('/login')
  await page.waitForSelector('#username')
  await page.locator('#username').pressSequentially(CUSTOMER.username)
  await page.fill('#password', 'WrongPassword!')
  await page.click('button[type=submit]')
  await expect(
    page.getByText('Invalid credentials'),
  ).toBeVisible({ timeout: 10_000 })
  // Should stay on login page
  await expect(page).toHaveURL(/\/login/)
})

// ---------------------------------------------------------------------------
// TC-E2E-025 — ADMIN credentials rejected with customer-only message
// ---------------------------------------------------------------------------
test('TC-E2E-025 admin login rejected with "customers only" message', async ({ page }) => {
  await page.goto('/login')
  await page.waitForSelector('#username')
  await page.locator('#username').pressSequentially(ADMIN.username)
  await page.fill('#password', ADMIN.password)
  await page.click('button[type=submit]')
  await expect(
    page.getByText('This store is for customers only.'),
  ).toBeVisible({ timeout: 10_000 })
  await expect(page).toHaveURL(/\/login/)
})

// ---------------------------------------------------------------------------
// TC-E2E-026 — Accessing /account without login redirects to /login
// ---------------------------------------------------------------------------
test('TC-E2E-026 /account without login redirects to /login?next=/account', async ({ page }) => {
  await page.goto('/account')
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  // URL should carry the next param
  await expect(page).toHaveURL(/next=.*account/)
})

// ---------------------------------------------------------------------------
// TC-E2E-027 — Login from /login?next=/account redirects back to /account
// ---------------------------------------------------------------------------
test('TC-E2E-027 login from ?next redirect returns to /account', async ({ page }) => {
  await page.goto('/login?next=%2Faccount')
  await page.waitForSelector('#username')
  await page.locator('#username').pressSequentially(CUSTOMER.username)
  await page.fill('#password', CUSTOMER.password)
  await page.click('button[type=submit]')
  await expect(page).toHaveURL(/\/account/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible()
})

// ---------------------------------------------------------------------------
// TC-E2E-028 — Logout redirects /account to /login
// ---------------------------------------------------------------------------
test('TC-E2E-028 logout causes /account to redirect to /login', async ({ page }) => {
  await loginAsCustomer(page)
  await expect(page).toHaveURL(/\/account/)

  // Click the "Sign out" button in the header
  await page.getByRole('button', { name: 'Sign out' }).click()

  // In WebKit the /account page immediately client-side redirects to /login after
  // logout (status: guest).  Wait for that redirect to complete before issuing a
  // new navigation — otherwise two navigations race and page.goto throws.
  await page.waitForURL(/\/login/, { timeout: 10_000 })

  // Navigate back to /account — should redirect to /login again
  await page.goto('/account')
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
})
