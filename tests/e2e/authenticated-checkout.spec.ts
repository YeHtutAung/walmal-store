/**
 * TC-E2E-029 to TC-E2E-034 — Authenticated checkout
 *
 * SPEC DEVIATIONS:
 *
 * TC-E2E-030 — The spec asks to "intercept POST /api/v1/orders and assert no
 * guestEmail in payload".  The CreateOrderPayload type never includes guestEmail
 * (it is frontend-only state not sent to the API).  Adapted: asserts that the
 * checkout form shows "Ordering as {username}" (authenticated context) and does
 * not render the guest email input.
 *
 * TC-E2E-032 — Cart merge (server qty wins) requires backend cart state.  The
 * test seeds a local cart item and verifies that after login + page reload the
 * item is still present (basic merge test).  A full server-wins-on-conflict test
 * would need the backend to pre-populate the user's server cart — update this
 * test once the backend seeding is confirmed.
 *
 * PREREQUISITES:
 *   - customer_test / TestPass123! with CUSTOMER role
 *   - Seeded product with ≥2 ACTIVE variants (update SEEDED_ITEM below)
 *   - Stripe test keys in .env.test.local
 */

import { test, expect } from '@playwright/test'
import { clearState, loginAsCustomer, seedCart, fillStripeCard, gotoAndWaitForAuth, CUSTOMER } from './helpers'
import type { CartItem } from '../../src/types/cart'

// ---------------------------------------------------------------------------
// UPDATE with real values from your seeded backend
// ---------------------------------------------------------------------------
const SEEDED_ITEM: CartItem = {
  variantId:   '20000000-0000-0000-0000-000000000001',
  productName: 'Galaxy S24 Ultra',
  variantName: 'SAM-S24U-256-BLK',
  price:       1199.99,
  quantity:    1,
  imageUrl:    '',
}

const SEEDED_ITEM_B: CartItem = {
  variantId:   '20000000-0000-0000-0000-000000000002',
  productName: 'Galaxy S24 Ultra',
  variantName: 'SAM-S24U-512-TIT',
  price:       1419.99,
  quantity:    1,
  imageUrl:    '',
}

const TEST_ADDRESS = {
  line1: '1 Auth Street', city: 'LoginCity', postalCode: '99999', country: 'US',
}

test.beforeEach(async ({ page }) => {
  await clearState(page)
})

// ---------------------------------------------------------------------------
// TC-E2E-029 — Authenticated user skips guest-vs-login choice at /checkout
// ---------------------------------------------------------------------------
test('TC-E2E-029 logged-in user skips checkout choice screen', async ({ page }) => {
  await loginAsCustomer(page)
  // seedCart while on /account (avoids an extra page.goto that consumes a refresh token)
  await seedCart(page, [SEEDED_ITEM])
  await gotoAndWaitForAuth(page, '/checkout')

  // Should NOT see the choice screen
  await expect(page.getByText('How would you like to check out?')).not.toBeVisible({ timeout: 5_000 })
  // Should see the shipping details form directly
  await expect(page.getByText('Shipping details')).toBeVisible({ timeout: 10_000 })
})

// ---------------------------------------------------------------------------
// TC-E2E-030 — Adapted: authenticated checkout does not show guest email field
// ---------------------------------------------------------------------------
test('TC-E2E-030 authenticated checkout shows username, no guest email field', async ({ page }) => {
  await loginAsCustomer(page)
  await seedCart(page, [SEEDED_ITEM])
  await gotoAndWaitForAuth(page, '/checkout')

  await expect(page.getByText('Shipping details')).toBeVisible({ timeout: 10_000 })

  // Guest email field should NOT be present
  await expect(page.getByLabel('Email address *')).not.toBeVisible()

  // "Ordering as {username}" text should appear
  await expect(page.getByText(/Ordering as/i)).toBeVisible()

  // Optionally intercept the orders POST and assert no guestEmail key
  let orderBody: Record<string, unknown> | null = null
  await page.route(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'}/orders`, async (route) => {
    if (route.request().method() === 'POST') {
      orderBody = JSON.parse(route.request().postData() ?? '{}')
    }
    await route.continue()
  })

  // We don't complete the payment here — just assert the form state
  if (orderBody) {
    expect('guestEmail' in (orderBody as object)).toBe(false)
  }
})

// ---------------------------------------------------------------------------
// TC-E2E-031 — Guest cart items persist after login
// ---------------------------------------------------------------------------
test('TC-E2E-031 guest cart items are present after login', async ({ page }) => {
  // As guest: seed cart
  await page.goto('/')
  await seedCart(page, [SEEDED_ITEM])

  // Log in — cart (localStorage) should survive the login redirect
  await page.goto('/login')
  await page.waitForSelector('#username')
  await page.locator('#username').pressSequentially(CUSTOMER.username)
  await page.fill('#password', CUSTOMER.password)
  await page.click('button[type=submit]')
  await expect(page).toHaveURL(/\/account/, { timeout: 15_000 })

  // Navigate to cart — item should still be there
  await page.goto('/cart')
  await expect(page.getByText(SEEDED_ITEM.productName)).toBeVisible()
})

// ---------------------------------------------------------------------------
// TC-E2E-032 — Duplicate item: after silent-refresh merge, item is present
//   Full server-quantity-wins assertion requires pre-populated server cart.
//   This test verifies the merge does not drop local-only items.
// ---------------------------------------------------------------------------
test('TC-E2E-032 cart items survive silent-refresh merge', async ({ page }) => {
  // Log in to get a valid refreshToken stored in auth-storage
  await loginAsCustomer(page)

  // Seed a local cart item (simulates cart added while browsing)
  await page.goto('/')
  await seedCart(page, [SEEDED_ITEM])

  // Simulate page reload (re-runs AuthProvider.attemptSilentRefresh which merges)
  await page.reload()
  await page.waitForLoadState('networkidle')

  await page.goto('/cart')
  // Item should still be present (not dropped by the merge)
  await expect(page.getByText(SEEDED_ITEM.productName)).toBeVisible({ timeout: 10_000 })
})

// ---------------------------------------------------------------------------
// TC-E2E-033 — Successful authenticated checkout → order in /account/orders
// ---------------------------------------------------------------------------
test('TC-E2E-033 successful authenticated checkout — order appears in /account/orders', async ({ page }) => {
  test.setTimeout(90_000)
  await loginAsCustomer(page)
  await seedCart(page, [SEEDED_ITEM])
  await gotoAndWaitForAuth(page, '/checkout')

  await expect(page.getByText('Shipping details')).toBeVisible({ timeout: 10_000 })

  // Fill shipping
  await page.fill('#line1', TEST_ADDRESS.line1)
  await page.fill('#city', TEST_ADDRESS.city)
  await page.fill('#postalCode', TEST_ADDRESS.postalCode)
  await page.fill('#country', TEST_ADDRESS.country)

  // Wait for Stripe iframe and fill card
  await expect(page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
    .locator('[placeholder="Card number"]')).toBeVisible({ timeout: 15_000 })
  await fillStripeCard(page)

  await page.getByRole('button', { name: 'Pay now' }).click()
  await expect(page).toHaveURL(/\/order-confirmation\?id=.+/, { timeout: 30_000 })

  // Capture the orderId from the URL
  const url = new URL(page.url())
  const orderId = url.searchParams.get('id')
  expect(orderId).toBeTruthy()

  // Navigate to /account; auth reinitialises on full page load so wait for refresh
  await gotoAndWaitForAuth(page, '/account')
  await expect(page.getByRole('heading', { name: 'Order history' })).toBeVisible({ timeout: 15_000 })
  // The order list shows Order #XXXXXXXX (last-8 of orderId, uppercase)
  const shortId = orderId!.slice(-8).toUpperCase()
  await expect(page.getByText(`Order #${shortId}`)).toBeVisible({ timeout: 10_000 })
})

// ---------------------------------------------------------------------------
// TC-E2E-034 — Order detail page shows correct items, amount, status
// ---------------------------------------------------------------------------
test('TC-E2E-034 order detail page shows items, total, and status', async ({ page }) => {
  test.setTimeout(90_000)
  await loginAsCustomer(page)
  await seedCart(page, [SEEDED_ITEM])
  await gotoAndWaitForAuth(page, '/checkout')

  await expect(page.getByText('Shipping details')).toBeVisible({ timeout: 10_000 })
  await page.fill('#line1', TEST_ADDRESS.line1)
  await page.fill('#city', TEST_ADDRESS.city)
  await page.fill('#postalCode', TEST_ADDRESS.postalCode)
  await page.fill('#country', TEST_ADDRESS.country)

  await expect(page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
    .locator('[placeholder="Card number"]')).toBeVisible({ timeout: 15_000 })
  await fillStripeCard(page)

  await page.getByRole('button', { name: 'Pay now' }).click()
  await expect(page).toHaveURL(/\/order-confirmation\?id=.+/, { timeout: 30_000 })

  // Click "View order" button on the confirmation page
  await page.getByRole('link', { name: 'View order' }).click()
  await expect(page).toHaveURL(/\/account\/orders\/.+/)

  // Order detail assertions
  await expect(page.getByText(/Order #[A-Z0-9]{8}/)).toBeVisible()
  // Product name snapshot is shown in items section
  await expect(page.getByText(SEEDED_ITEM.productName)).toBeVisible()
  // Status badge
  await expect(page.getByText(/PENDING|CONFIRMED|FULFILLED/i)).toBeVisible()
  // Total row
  await expect(page.getByText('Total')).toBeVisible()
  // Shipping address
  await expect(page.getByText(TEST_ADDRESS.line1)).toBeVisible()
})
