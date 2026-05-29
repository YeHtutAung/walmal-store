import { type Page } from '@playwright/test'
import type { CartItem } from '../../src/types/cart'

// ---------------------------------------------------------------------------
// Seeded test credentials — must exist in the backend before running E2E tests
// ---------------------------------------------------------------------------
export const CUSTOMER = {
  username: 'customer_test',
  // Email used when seeding the account — update if the seeded email differs.
  email:    'customer@test.com',
  password: 'TestPass123!',
}
export const ADMIN = { username: 'admin_test', password: 'AdminPass123!' }

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/** Navigate to /login, fill credentials, wait for redirect to /account. */
export async function loginAs(page: Page, username: string, password: string) {
  await page.goto('/login')
  await page.fill('#username', username)
  await page.fill('#password', password)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/account/, { timeout: 15_000 })
}

export const loginAsCustomer = (page: Page) =>
  loginAs(page, CUSTOMER.username, CUSTOMER.password)

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

/**
 * Wipe localStorage and cookies so each test starts clean.
 * Call at the start of every test (or in beforeEach).
 */
export async function clearState(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.context().clearCookies()
}

/**
 * Inject cart items directly into localStorage, bypassing the need to browse
 * as an authenticated user.  Use realistic-looking IDs from the seeded backend.
 */
export async function seedCart(page: Page, items: CartItem[]) {
  await page.evaluate((cartItems) => {
    localStorage.setItem(
      'walmal-cart',
      JSON.stringify({ state: { items: cartItems }, version: 0 }),
    )
  }, items)
}

// ---------------------------------------------------------------------------
// Stripe helpers
// ---------------------------------------------------------------------------

/**
 * Fill Stripe's CardElement iframe.
 *
 * The `CardElement` renders a single iframe whose name starts with
 * "__privateStripeFrame".  Inside it, card number / expiry / CVC are
 * separate labelled input fields.
 *
 * If this selector stops working after a Stripe-JS upgrade, inspect the
 * iframe's DOM in a headed browser run to find the updated field names.
 */
export async function fillStripeCard(
  page: Page,
  opts: { number: string; expiry: string; cvc: string } = {
    number: '4242424242424242',
    expiry: '1226',
    cvc:    '123',
  },
) {
  const frame = page.frameLocator('iframe[name^="__privateStripeFrame"]').last()
  await frame.locator('[placeholder="Card number"]').click()
  await page.keyboard.type(opts.number)
  await page.keyboard.press('Tab')
  await page.keyboard.type(opts.expiry)
  await page.keyboard.press('Tab')
  await page.keyboard.type(opts.cvc)
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

/** Wait for the auth provider's silent-refresh to settle (idle → guest|authenticated). */
export async function waitForAuthReady(page: Page) {
  await page.waitForFunction(
    () => {
      try {
        const raw = localStorage.getItem('auth-storage')
        // Zustand persist key; if not present, auth store is still in-memory idle
        // and the AuthProvider useEffect has not run yet — wait a bit more.
        return raw !== undefined
      } catch {
        return false
      }
    },
    { timeout: 10_000 },
  )
  // Also give React a tick to flush useEffect
  await page.waitForTimeout(300)
}
