/**
 * TC-E2E-011 to TC-E2E-020 — Guest checkout flow
 *
 * NOTES:
 * - Cart items are seeded via localStorage injection (not by browsing) because
 *   product browsing requires authentication.  Replace the seeded variantId /
 *   productName with real values from your seeded backend data.
 * - TC-E2E-015 to TC-E2E-020 require real Stripe test keys in .env.test.local.
 * - TC-E2E-019 uses page.route() to assert the orders endpoint is NOT called
 *   after a payment failure.
 *
 * PREREQUISITES:
 *   - Next.js + backend running
 *   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY set in
 *     .env.test.local (Stripe test mode)
 *   - Seeded product with a known variantId — update SEEDED_ITEM below
 */

import { test, expect } from '@playwright/test'
import { clearState, seedCart, fillStripeCard } from './helpers'
import type { CartItem } from '../../src/types/cart'

// ---------------------------------------------------------------------------
// UPDATE THIS with a real variantId + locationId from your seeded backend
// ---------------------------------------------------------------------------
const SEEDED_ITEM: CartItem = {
  variantId:   '20000000-0000-0000-0000-000000000001',
  productName: 'Velocity Elite FG Boot',
  variantName: 'WP-VELO-LE-UK9',
  price:       1199.99,
  quantity:    1,
  imageUrl:    '',
}

const TEST_ADDRESS = {
  line1:      '123 Test Street',
  city:       'Testville',
  postalCode: '12345',
  country:    'US',
}

test.beforeEach(async ({ page }) => {
  await clearState(page)
  await page.goto('/')
  await seedCart(page, [SEEDED_ITEM])
})

// ---------------------------------------------------------------------------
// TC-E2E-011
// ---------------------------------------------------------------------------
test('TC-E2E-011 /checkout shows guest-vs-login choice when not logged in', async ({ page }) => {
  await page.goto('/checkout')
  await expect(page.getByText('How would you like to check out?')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue as guest' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in / Register' })).toBeVisible()
})

// ---------------------------------------------------------------------------
// TC-E2E-012
// ---------------------------------------------------------------------------
test('TC-E2E-012 selecting "Continue as Guest" reveals guest email field', async ({ page }) => {
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Continue as guest' }).click()
  await expect(page.getByLabel('Email address *')).toBeVisible()
})

// ---------------------------------------------------------------------------
// TC-E2E-013
// ---------------------------------------------------------------------------
test('TC-E2E-013 submitting with empty email shows validation error', async ({ page }) => {
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Continue as guest' }).click()
  const emailInput = page.getByLabel('Email address *')
  await expect(emailInput).toBeVisible()

  // Focus then blur without typing — browser marks as invalid
  await emailInput.focus()
  await emailInput.blur()

  const invalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
  expect(invalid).toBe(true)
})

// ---------------------------------------------------------------------------
// TC-E2E-014
// ---------------------------------------------------------------------------
test('TC-E2E-014 invalid email format marks the field as invalid', async ({ page }) => {
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Continue as guest' }).click()
  const emailInput = page.getByLabel('Email address *')
  await emailInput.fill('not-an-email')
  await emailInput.blur()

  const invalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
  expect(invalid).toBe(true)
})

// ---------------------------------------------------------------------------
// TC-E2E-015 — full happy-path checkout with test card 4242424242424242
// ---------------------------------------------------------------------------
test('TC-E2E-015 successful guest checkout with Stripe test card', async ({ page }) => {
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Continue as guest' }).click()

  // Fill guest email
  await page.getByLabel('Email address *').fill('guest@test.com')

  // Fill address
  await page.fill('#line1', TEST_ADDRESS.line1)
  await page.fill('#city', TEST_ADDRESS.city)
  await page.fill('#postalCode', TEST_ADDRESS.postalCode)
  await page.fill('#country', TEST_ADDRESS.country)

  // Wait for Stripe CardElement to load and fill card details
  await expect(page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
    .locator('[placeholder="Card number"]')).toBeVisible({ timeout: 15_000 })
  await fillStripeCard(page)

  // Submit payment
  await page.getByRole('button', { name: 'Pay now' }).click()

  // TC-E2E-016: redirected to /order-confirmation with orderId in URL
  await expect(page).toHaveURL(/\/order-confirmation\?id=.+/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Order confirmed!' })).toBeVisible()

  // TC-E2E-017: cart is cleared after successful order (Bag page empty state)
  await page.goto('/cart')
  await expect(page.getByText('Your bag is empty')).toBeVisible()
})

// ---------------------------------------------------------------------------
// TC-E2E-016 — assertion folded into TC-E2E-015 above (order URL + heading)
// ---------------------------------------------------------------------------
// (No separate test — TC-E2E-015 already asserts the redirect and orderId URL)

// ---------------------------------------------------------------------------
// TC-E2E-017 — assertion folded into TC-E2E-015 above (cart cleared)
// ---------------------------------------------------------------------------
// (No separate test — TC-E2E-015 already asserts cart is empty after order)

// ---------------------------------------------------------------------------
// TC-E2E-018 — declined card 4000000000009995
// ---------------------------------------------------------------------------
test('TC-E2E-018 declined card shows Stripe error message, form re-enabled', async ({ page }) => {
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Continue as guest' }).click()
  await page.getByLabel('Email address *').fill('guest@test.com')
  await page.fill('#line1', TEST_ADDRESS.line1)
  await page.fill('#city', TEST_ADDRESS.city)
  await page.fill('#postalCode', TEST_ADDRESS.postalCode)
  await page.fill('#country', TEST_ADDRESS.country)

  await expect(page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
    .locator('[placeholder="Card number"]')).toBeVisible({ timeout: 15_000 })
  await fillStripeCard(page, { number: '4000000000009995', expiry: '1226', cvc: '123' })

  await page.getByRole('button', { name: 'Pay now' }).click()

  // Stripe error message should appear in the form
  await expect(page.locator('[class*="text-destructive"]').first()).toBeVisible({ timeout: 20_000 })

  // Form should be re-enabled (Pay now button clickable again)
  await expect(page.getByRole('button', { name: 'Pay now' })).toBeEnabled({ timeout: 10_000 })
})

// ---------------------------------------------------------------------------
// TC-E2E-019 — no order created when payment fails
// ---------------------------------------------------------------------------
test('TC-E2E-019 failed payment does not create an order', async ({ page }) => {
  let ordersCallMade = false
  await page.route('**/api/v1/orders', (route) => {
    if (route.request().method() === 'POST') {
      ordersCallMade = true
    }
    route.continue()
  })

  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Continue as guest' }).click()
  await page.getByLabel('Email address *').fill('guest@test.com')
  await page.fill('#line1', TEST_ADDRESS.line1)
  await page.fill('#city', TEST_ADDRESS.city)
  await page.fill('#postalCode', TEST_ADDRESS.postalCode)
  await page.fill('#country', TEST_ADDRESS.country)

  await expect(page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
    .locator('[placeholder="Card number"]')).toBeVisible({ timeout: 15_000 })
  // Use a card that Stripe declines before creating a PaymentIntent confirmation
  await fillStripeCard(page, { number: '4000000000000002', expiry: '1226', cvc: '123' })

  await page.getByRole('button', { name: 'Pay now' }).click()
  await expect(page.locator('[class*="text-destructive"]').first()).toBeVisible({ timeout: 20_000 })

  expect(ordersCallMade).toBe(false)
})

// ---------------------------------------------------------------------------
// TC-E2E-020 — insufficient funds card 4000000000009995 error message
// ---------------------------------------------------------------------------
test('TC-E2E-020 insufficient-funds card shows correct user-facing error', async ({ page }) => {
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Continue as guest' }).click()
  await page.getByLabel('Email address *').fill('guest@test.com')
  await page.fill('#line1', TEST_ADDRESS.line1)
  await page.fill('#city', TEST_ADDRESS.city)
  await page.fill('#postalCode', TEST_ADDRESS.postalCode)
  await page.fill('#country', TEST_ADDRESS.country)

  await expect(page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
    .locator('[placeholder="Card number"]')).toBeVisible({ timeout: 15_000 })
  // 4000000000009995 = insufficient_funds decline
  await fillStripeCard(page, { number: '4000000000009995', expiry: '1226', cvc: '123' })

  await page.getByRole('button', { name: 'Pay now' }).click()

  // Stripe returns "Your card has insufficient funds." for this test card
  await expect(
    page.getByText(/insufficient funds|Your card has insufficient funds/i),
  ).toBeVisible({ timeout: 20_000 })
})
