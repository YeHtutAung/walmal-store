/**
 * TC-E2E-HOME-CONTENT — Data-driven home page + Draft Mode preview gating
 *
 * The feat/home-content branch made the home page render admin-managed content
 * from GET /api/v1/content/home (with a static fallback), and added two
 * token-gated Draft Mode routes:
 *   - GET /api/preview?token=…   → 401 on missing/wrong token; on the correct
 *     token, enables draft mode and redirects to /.
 *   - GET /api/preview/disable   → exits draft mode, redirects to /.
 *
 * This spec covers the ROUTING / GATING CONTRACT and a no-regression home
 * render only.  It deliberately does NOT assert any specific published/draft
 * CONTENT text: that depends on mutable backend `content_home` state plus
 * Next.js fetch caching and would be flaky.  The full published→preview content
 * flow is verified separately by a manual full-stack test.
 *
 * DETERMINISM NOTE — positive-token case intentionally omitted:
 *   The preview route validates the incoming token against the STORE's own
 *   process.env.CONTENT_PREVIEW_TOKEN.  Neither playwright.config.ts nor the
 *   store's env files (.env.local / .env.test.local) set CONTENT_PREVIEW_TOKEN
 *   to a known value, so the correct token is not deterministic from the test
 *   harness's point of view — the positive redirect case is therefore skipped.
 *   The negative 401 case below is fully deterministic: 'definitely-wrong'
 *   never matches, and an unset expected token also yields 401 (the route
 *   fails closed on `!expected`).
 *
 * PREREQUISITES (started/reused automatically by playwright.config webServer):
 *   - Next.js dev server on http://localhost:3001 (baseURL)
 *   - Backend on http://localhost:8080 (test Spring profile)
 */

import { test, expect } from '@playwright/test'
import { clearState } from './helpers'

test.beforeEach(async ({ page }) => {
  await clearState(page)
})

// ---------------------------------------------------------------------------
// 1. Home renders (no regression) — hero section is present whether the page is
//    showing the static fallback or published CMS content.  Both code paths
//    render an <h1> and a CTA link inside the hero <section>, so assert those
//    generically rather than any specific (mutable) copy.
// ---------------------------------------------------------------------------
test('home page renders the hero section (static fallback or published content)', async ({
  page,
}) => {
  await page.goto('/')

  // The hero is the first <section> on the page in both render paths.
  const hero = page.locator('section').first()
  const heroHeading = hero.getByRole('heading', { level: 1 })
  await expect(heroHeading).toBeVisible()
  await expect(heroHeading).not.toBeEmpty()

  // Hero always carries at least one CTA link (primary CTA in both paths).
  await expect(hero.getByRole('link').first()).toBeVisible()
})

// ---------------------------------------------------------------------------
// 2. Preview token gate — a wrong token is rejected with 401.  Fully
//    deterministic: depends only on the store's env, and 'definitely-wrong'
//    can never match the configured token (nor an unset one — route fails
//    closed).  Use maxRedirects:0 so a hypothetical redirect wouldn't be
//    silently followed into a 200 and mask a gating regression.
// ---------------------------------------------------------------------------
test('preview route rejects a wrong token with 401', async ({ request }) => {
  const res = await request.get('/api/preview?token=definitely-wrong', {
    maxRedirects: 0,
  })
  expect(res.status()).toBe(401)
})

// ---------------------------------------------------------------------------
// 3. Preview disable is reachable — exits draft mode and redirects to /.
//    Assert it responds with a redirect (or 200 if followed) and, above all,
//    never 500s.  maxRedirects:0 captures the raw redirect status.
// ---------------------------------------------------------------------------
test('preview disable route is reachable and redirects (never 500)', async ({ request }) => {
  const res = await request.get('/api/preview/disable', { maxRedirects: 0 })
  expect(res.status()).not.toBe(500)
  // NextResponse.redirect defaults to 307; accept any redirect or a followed 200.
  expect([200, 301, 302, 303, 307, 308]).toContain(res.status())
})
