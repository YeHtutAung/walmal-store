/**
 * TC-E2E-001 to TC-E2E-010 — Guest browsing + cart
 *
 * All tests run as an unauthenticated guest.  Product endpoints are public
 * (GET /api/v1/product/**) so no login is required to browse or add to cart.
 *
 * SPEC DEVIATIONS:
 *
 * TC-E2E-003 — No category-filter UI exists in the frontend yet (backend has
 *   GET /api/v1/product/categories/{id}/products but the frontend never wired
 *   it up — see ISSUE 2, option B).  Test adapted to search-based filtering
 *   via ?q= until the category filter UI is implemented.
 *
 * TC-E2E-005 — ProductDetail shows a fixed `lowestPrice`; per-variant prices
 *   are not displayed.  Adapted to assert the "Add to cart" button is disabled
 *   with no variant selected and enabled after selection.
 *
 * TC-E2E-007 — CartDrawer is now wired into SiteHeader; clicking the cart
 *   icon opens a slide-out drawer.  Test updated to click the icon and assert
 *   the drawer content.
 *
 * PREREQUISITES:
 *   - Next.js dev server running on http://localhost:3000
 *   - Backend running on http://localhost:8080 with public product endpoints
 *   - At least one product with ≥2 ACTIVE variants seeded
 */

import { test, expect } from '@playwright/test'
import { clearState, seedCart } from './helpers'
import type { CartItem } from '../../src/types/cart'

test.beforeEach(async ({ page }) => {
  await clearState(page)
})

// ---------------------------------------------------------------------------
// TC-E2E-001
// ---------------------------------------------------------------------------
test('TC-E2E-001 home page loads with hero and product sections', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /own\s*the pitch\./i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'New Arrivals' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Shop new arrivals' })).toBeVisible()
})

// ---------------------------------------------------------------------------
// TC-E2E-002
// ---------------------------------------------------------------------------
test('TC-E2E-002 /products renders product grid for unauthenticated guest', async ({ page }) => {
  await page.goto('/products')
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()
  await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 10_000 })
  // At least one product card should appear (requires seeded products)
  await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible()
})

// ---------------------------------------------------------------------------
// TC-E2E-003 — adapted: search filter (category filter UI not yet implemented)
// ---------------------------------------------------------------------------
test('TC-E2E-003 search filter — ?q= updates URL and grid refreshes', async ({ page }) => {
  await page.goto('/products?q=jersey')
  await expect(page).toHaveURL(/q=jersey/)
  await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 10_000 })
  await expect(page.locator('text=/\\d+ products/')).toBeVisible()
})

// ---------------------------------------------------------------------------
// TC-E2E-004
// ---------------------------------------------------------------------------
test('TC-E2E-004 clicking product card navigates to product detail', async ({ page }) => {
  await page.goto('/products')
  await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 10_000 })
  await page.locator('[data-testid="product-card-link"]').first().click()
  await expect(page).toHaveURL(/\/products\/.+/)
  await expect(page.getByRole('button', { name: 'Add to cart' })).toBeVisible()
})

// ---------------------------------------------------------------------------
// TC-E2E-005 — adapted: variant enables "Add to cart" (no per-variant price)
// ---------------------------------------------------------------------------
test('TC-E2E-005 selecting a variant enables the Add to cart button', async ({ page }) => {
  await page.goto('/products')
  await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 10_000 })
  await page.locator('[data-testid="product-card-link"]').first().click()
  await expect(page).toHaveURL(/\/products\/.+/)

  const addBtn = page.getByRole('button', { name: 'Add to cart' })
  await expect(addBtn).toBeDisabled()

  await page.locator('text=Select variant').locator('..').getByRole('button').first().click()
  await expect(addBtn).toBeEnabled()
})

// ---------------------------------------------------------------------------
// TC-E2E-006
// ---------------------------------------------------------------------------
test('TC-E2E-006 add to cart — cart icon badge increments', async ({ page }) => {
  await page.goto('/products')
  await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 10_000 })
  await page.locator('[data-testid="product-card-link"]').first().click()
  await expect(page).toHaveURL(/\/products\/.+/)

  await page.locator('text=Select variant').locator('..').getByRole('button').first().click()
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await expect(page.getByRole('button', { name: 'Added to cart!' })).toBeVisible()

  // Cart icon badge should reflect the new item count
  const cartBtn = page.getByRole('button', { name: /Cart \(\d+ items?\)/i })
  await expect(cartBtn).toBeVisible()
  await expect(cartBtn.locator('span.rounded-full')).toBeVisible()
})

// ---------------------------------------------------------------------------
// TC-E2E-007 — CartDrawer (now wired into SiteHeader)
// ---------------------------------------------------------------------------
test('TC-E2E-007 cart drawer opens and shows the added item', async ({ page }) => {
  await page.goto('/products')
  await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 10_000 })
  await page.locator('[data-testid="product-card-link"]').first().click()
  // Wait for the detail page before reading its h1 — reading immediately after
  // click() races the navigation and can capture the listing page's "Products".
  await expect(page).toHaveURL(/\/products\/.+/)
  const productName = await page.getByRole('heading', { level: 1 }).innerText()

  await page.locator('text=Select variant').locator('..').getByRole('button').first().click()
  await page.getByRole('button', { name: 'Add to cart' }).click()

  // Click cart icon to open drawer
  await page.getByRole('button', { name: /Cart \(\d+ items?\)/i }).click()

  // Drawer heading and item should be visible (scope to the dialog — the
  // detail page h1 behind the overlay carries the same text)
  await expect(page.getByRole('heading', { name: /Your cart/i })).toBeVisible()
  await expect(page.getByRole('dialog').getByText(productName)).toBeVisible()
})

// ---------------------------------------------------------------------------
// TC-E2E-008
// ---------------------------------------------------------------------------
test('TC-E2E-008 change quantity in drawer — total updates', async ({ page }) => {
  await page.goto('/products')
  await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 10_000 })
  await page.locator('[data-testid="product-card-link"]').first().click()
  await page.locator('text=Select variant').locator('..').getByRole('button').first().click()
  await page.getByRole('button', { name: 'Add to cart' }).click()

  // Open cart drawer
  await page.getByRole('button', { name: /Cart \(\d+ items?\)/i }).click()
  await expect(page.getByRole('heading', { name: /Your cart/i })).toBeVisible()

  // Read initial subtotal text
  const summaryInitial = await page.getByText(/Subtotal/).innerText()

  // Click the + button (Plus is the last icon button in the qty control)
  const qtySpan = page.locator('span.w-6.text-center').first()
  const controlsDiv = qtySpan.locator('..')
  await controlsDiv.getByRole('button').last().click()

  const summaryUpdated = await page.getByText(/Subtotal/).innerText()
  expect(summaryUpdated).not.toBe(summaryInitial)
})

// ---------------------------------------------------------------------------
// TC-E2E-009
// ---------------------------------------------------------------------------
test('TC-E2E-009 removing item from drawer empties the cart', async ({ page }) => {
  await page.goto('/products')
  await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 10_000 })
  await page.locator('[data-testid="product-card-link"]').first().click()
  await page.locator('text=Select variant').locator('..').getByRole('button').first().click()
  await page.getByRole('button', { name: 'Add to cart' }).click()

  // Open cart drawer
  await page.getByRole('button', { name: /Cart \(\d+ items?\)/i }).click()
  await expect(page.getByRole('heading', { name: /Your cart/i })).toBeVisible()

  // Click the trash (destructive) button on the item
  await page.locator('[class*="text-destructive"]').first().click()

  await expect(page.getByText('Your cart is empty.')).toBeVisible()
})

// ---------------------------------------------------------------------------
// TC-E2E-010 — Cart persistence (localStorage, no auth needed)
// ---------------------------------------------------------------------------
test('TC-E2E-010 cart persists across page reload', async ({ page }) => {
  const cartItem: CartItem = {
    variantId:   'test-variant-persist',
    productName: 'Persistence Test Shirt',
    variantName: 'Blue / L',
    price:       2999,
    quantity:    2,
    imageUrl:    '',
  }

  await page.goto('/')
  await seedCart(page, [cartItem])
  await page.reload()

  // Open cart drawer to verify item survived the reload
  await page.getByRole('button', { name: /Cart \(\d+ items?\)/i }).click()
  await expect(page.getByText('Persistence Test Shirt')).toBeVisible()
})
