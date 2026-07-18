/**
 * TC-E2E-038 to TC-E2E-041 — Sport listing filters/sort + "Your Bag" page
 * (035–037 are taken by wishlist.spec.ts — IDs are unique handles)
 *
 * These tests assume Playwright's default desktop viewport: `FilterSidebar`
 * only renders at `lg:` and up (mobile shows a category chip rail instead),
 * so a narrow viewport would make the brand-filter/sort assertions fail to
 * find the sidebar at all.
 */

import { test, expect } from '@playwright/test'
import { clearState, seedCart } from './helpers'
import type { CartItem } from '../../src/types/cart'

const SOCKS: CartItem = {
  variantId:   '20000000-0000-0000-0000-000000000025',
  productName: 'Grip Training Socks',
  variantName: '',
  price:       22,
  quantity:    1,
  imageUrl:    '',
}

const BOOT: CartItem = {
  variantId:   '20000000-0000-0000-0000-000000000001',
  productName: 'Velocity Elite FG Boot',
  variantName: 'WP-VELO-LE-UK9',
  price:       1199.99,
  quantity:    1,
  imageUrl:    '',
}

test.beforeEach(async ({ page }) => {
  await clearState(page)
})

// ---------------------------------------------------------------------------
// TC-E2E-038
// ---------------------------------------------------------------------------
test('TC-E2E-038 brand filter narrows the grid and count, Clear all restores it', async ({ page }) => {
  await page.goto('/products')
  await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 10_000 })

  const countText = page.locator('text=/\\d+ products/')
  const initialCount = await countText.innerText()

  // First brand facet in the sidebar — don't hardcode a brand name, the
  // seeded catalog is real data and facet order depends on counts.
  const firstFacet = page.locator('aside ul li').first()
  const facetSpans = firstFacet.locator('label span')
  const brandName = await facetSpans.nth(1).innerText()
  const facetCount = await facetSpans.nth(2).innerText()

  // The checkbox itself is visually `sr-only`; the decorative checkmark span
  // sits on top of it and intercepts pointer events. Click the wrapping
  // <label> instead — native label-click semantics toggle the input.
  await firstFacet.locator('label').click()

  await expect(countText).toHaveText(`${facetCount} products`)

  const cards = page.locator('[data-testid="product-card"]')
  const visibleCount = await cards.count()
  expect(visibleCount).toBe(Number(facetCount))
  for (let i = 0; i < visibleCount; i++) {
    await expect(cards.nth(i).locator('p').first()).toHaveText(brandName)
  }

  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(countText).toHaveText(initialCount)
})

// ---------------------------------------------------------------------------
// TC-E2E-039
// ---------------------------------------------------------------------------
test('TC-E2E-039 Price: Low to High sorts the cheapest seeded product first', async ({ page }) => {
  await page.goto('/products')
  await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 10_000 })

  await page.getByLabel('Sort products').selectOption('price-asc')

  const firstCard = page.locator('[data-testid="product-card"]').first()
  await expect(firstCard).toContainText('$22.00')
})

// ---------------------------------------------------------------------------
// TC-E2E-040
// ---------------------------------------------------------------------------
test('TC-E2E-040 bag page: qty stepper updates totals, Remove empties the bag', async ({ page }) => {
  await page.goto('/')
  await seedCart(page, [SOCKS])
  await page.goto('/cart')

  await expect(page.getByRole('heading', { level: 1, name: /Your Bag \(1\)/ })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Grip Training Socks')).toBeVisible()

  await page.getByRole('button', { name: 'Increase quantity, Grip Training Socks' }).click()

  // Scope to the line item's own price column — Subtotal/Total in the
  // summary also read $44.00 once qty is 2 (single-item bag).
  await expect(page.locator('.shrink-0.text-right').filter({ hasText: '$44.00' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: /Your Bag \(2\)/ })).toBeVisible()

  await page.getByRole('button', { name: 'Remove Grip Training Socks' }).click()

  await expect(page.getByText('Your bag is empty')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Shop the store' })).toBeVisible()
})

// ---------------------------------------------------------------------------
// TC-E2E-041
// ---------------------------------------------------------------------------
test('TC-E2E-041 free-delivery progress caption below threshold, Free at/above it', async ({ page }) => {
  await page.goto('/')
  await seedCart(page, [SOCKS])
  await page.goto('/cart')

  await expect(
    page.getByText('Add $58.00 more for free local delivery.'),
  ).toBeVisible({ timeout: 10_000 })

  await clearState(page)
  await page.goto('/')
  await seedCart(page, [BOOT])
  await page.goto('/cart')

  await expect(page.getByText('Free', { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/more for free local delivery/)).not.toBeVisible()
})
