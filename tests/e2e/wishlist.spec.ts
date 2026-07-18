/**
 * TC-E2E-035 to TC-E2E-037 — Wishlist heart toggle
 * (033/034 are taken by authenticated-checkout — IDs are unique handles)
 *
 * Local-only wishlist (localStorage `walmal-wishlist`): save from a product
 * card, verify via the header badge and /saved, remove, and persistence.
 */

import { test, expect } from '@playwright/test'
import { clearState } from './helpers'

test.beforeEach(async ({ page }) => {
  await clearState(page)
})

test('TC-E2E-035 saving from a card fills the heart, badges, and /saved', async ({ page }) => {
  await page.goto('/products')
  await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 10_000 })

  const card = page.locator('[data-testid="product-card"]').first()
  const productName = await card.locator('h3').innerText()
  await card.getByRole('button', { name: `Save ${productName}` }).click()

  await expect(
    card.getByRole('button', { name: `Remove ${productName} from saved` }),
  ).toHaveAttribute('aria-pressed', 'true')
  // Desktop header heart link announces the count
  await expect(page.getByRole('link', { name: 'Saved items (1)' })).toBeVisible()

  await page.goto('/saved')
  await expect(page.locator('li').getByText(productName)).toBeVisible()
  await expect(page.getByText('1 item saved for later')).toBeVisible()
})

test('TC-E2E-036 removing on /saved restores the empty state', async ({ page }) => {
  await page.goto('/products')
  await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 10_000 })
  const card = page.locator('[data-testid="product-card"]').first()
  const productName = await card.locator('h3').innerText()
  await card.getByRole('button', { name: `Save ${productName}` }).click()

  await page.goto('/saved')
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByText('Nothing saved yet')).toBeVisible()
})

test('TC-E2E-037 saved state persists across reload', async ({ page }) => {
  await page.goto('/products')
  await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 10_000 })
  const card = page.locator('[data-testid="product-card"]').first()
  const productName = await card.locator('h3').innerText()
  await card.getByRole('button', { name: `Save ${productName}` }).click()

  await page.reload()
  await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 10_000 })
  await expect(
    page
      .locator('[data-testid="product-card"]')
      .first()
      .getByRole('button', { name: `Remove ${productName} from saved` }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Saved items (1)' })).toBeVisible()
})
