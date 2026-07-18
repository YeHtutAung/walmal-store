/**
 * TC-E2E-042 — Demo-mode banner
 * (035–037 wishlist, 038–041 listing/bag; IDs are unique handles)
 *
 * The deployed store runs Stripe in TEST mode; the banner tells visitors to
 * use the 4242 test card. This spec does NOT use clearState (which pre-seeds
 * the dismissal for every other spec) — it manages its own clean state.
 */

import { test, expect } from '@playwright/test'

test('TC-E2E-042 banner shows for new visitors, dismisses, stays dismissed after reload', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  const banner = page.getByTestId('demo-banner')
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('4242 4242 4242 4242')

  await banner.getByRole('button', { name: 'Dismiss demo notice' }).click()
  await expect(banner).not.toBeVisible()

  await page.reload()
  await expect(page.getByTestId('demo-banner')).not.toBeVisible()
})
