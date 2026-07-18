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
  // Wait for React's Suspense-deferred LoginForm to finish client-side rendering
  // before filling — needed in WebKit (slower JSCore) to avoid the form being
  // mounted mid-fill and overwriting the filled value.
  await page.waitForSelector('#username')
  // Use pressSequentially (char-by-char) instead of fill for the username field.
  // fill() dispatches a single synthetic input event; in WebKit the AuthProvider's
  // useEffect (idle→guest) can trigger a re-render that resets the controlled
  // input value before React batches the onChange update.  pressSequentially fires
  // one event per character so each character's state update survives the race.
  await page.locator('#username').pressSequentially(username)
  await page.fill('#password', password)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/account/, { timeout: 15_000 })
  await page.waitForTimeout(500)
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
    // Pre-seed the demo-banner dismissal so the pre-banner test suite never
    // sees it (TC-E2E-042 owns banner coverage and skips this helper's
    // pre-seed). Note this goto('/') renders the banner once before the
    // seed lands — safe because every spec navigates again after
    // beforeEach; a future spec acting directly on this page must not.
    localStorage.setItem('walmal-demo-banner-dismissed', '1')
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
  const frame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
  const cardInput = frame.locator('[placeholder="Card number"]')
  await cardInput.click()
  // Use pressSequentially on the iframe locator so Firefox doesn't lose focus.
  // Stripe auto-advances focus through all fields (card→expiry→CVC) — no Tab needed.
  await cardInput.pressSequentially(opts.number + opts.expiry + opts.cvc, { delay: 20 })
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to a URL and wait for the AuthProvider's silent-refresh API call to
 * complete.  Using Promise.all ensures the listener is registered before
 * navigation starts, so the /auth/refresh response is never missed.
 *
 * Avoids waitUntil:'networkidle' which is unreliable when the page contains
 * Stripe's CardElement (Stripe keeps background connections open indefinitely).
 */
export async function gotoAndWaitForAuth(page: Page, url: string) {
  await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes('/auth/refresh'),
      { timeout: 30_000 },
    ),
    page.goto(url),
  ])
}
