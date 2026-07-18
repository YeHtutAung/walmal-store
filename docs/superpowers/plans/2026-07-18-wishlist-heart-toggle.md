# Wishlist Heart Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing wishlist entry point — a heart toggle on every product card and the product detail page — so the shipped Saved page/badges pipeline is reachable from the UI.

**Architecture:** One shared `WishlistHeart` client component (two size variants) wired into `ProductCard` and `ProductDetail`. Store is untouched (`useWishlistStore.toggle` already exists). No toasts; feedback is heart fill + existing count badges.

**Tech Stack:** Next.js App Router, Zustand (`walmal-wishlist` persist), lucide `Heart`, vitest + @testing-library/react, Playwright.

**Reference:** Spec `docs/superpowers/specs/2026-07-18-wishlist-heart-toggle-design.md` (approved). Repo: `C:/YHA/006_Claude_Workspace/walmal-store`.

**Invariants:** `data-testid="product-card"`/`product-card-link` unchanged; card click still navigates; no store changes; hydration-guard rule (`useMounted`) applies to saved state.

---

### Task 1: `WishlistHeart` component (TDD)

**Files:**
- Create: `src/components/product/wishlist-heart.tsx`
- Test: `tests/components/product/wishlist-heart.test.tsx`

- [ ] **Step 1.1: Write the failing test** (conventions mirror `tests/components/cart/cart-drawer.test.tsx` — direct store manipulation, userEvent):

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { WishlistHeart } from '@/components/product/wishlist-heart'
import { useWishlistStore } from '@/store/wishlist-store'
import type { Product } from '@/types/product'

const product: Product = {
  productId: 'p1',
  name: 'Velocity Elite FG Boot',
  slug: 'velocity-elite-fg-boot',
  brand: 'Walmal Pro',
  lowestPrice: 1199.99,
  currency: 'USD',
  primaryImageUrl: '/img/boot.png',
}

beforeEach(() => useWishlistStore.setState({ items: [] }))

describe('WishlistHeart', () => {
  it('toggles the product into the store with the mapped fields', async () => {
    render(<WishlistHeart product={product} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save Velocity Elite FG Boot' }))
    const items = useWishlistStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({
      productId: 'p1',
      name: 'Velocity Elite FG Boot',
      brand: 'Walmal Pro',
      price: 1199.99,
      currency: 'USD',
      imageUrl: '/img/boot.png',
    })
  })

  it('reflects saved state via aria-pressed and toggles back out', async () => {
    render(<WishlistHeart product={product} />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Remove Velocity Elite FG Boot from saved' })).toBe(btn)
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    expect(useWishlistStore.getState().items).toHaveLength(0)
  })
})
```

- [ ] **Step 1.2: Run it — must fail** with module not found:

Run: `npm test -- tests/components/product/wishlist-heart.test.tsx`
Expected: FAIL (`Cannot find module '@/components/product/wishlist-heart'` or similar).

- [ ] **Step 1.3: Implement the component:**

```tsx
'use client'

import { Heart } from 'lucide-react'
import { useWishlistStore } from '@/store/wishlist-store'
import { useMounted } from '@/hooks/use-mounted'
import type { Product } from '@/types/product'

interface WishlistHeartProps {
  product: Product
  /** 'card' overlays the product image; 'detail' sits on the page background. */
  size?: 'card' | 'detail'
}

export function WishlistHeart({ product, size = 'card' }: WishlistHeartProps) {
  const toggle = useWishlistStore((s) => s.toggle)
  const inStore = useWishlistStore((s) =>
    s.items.some((i) => i.productId === product.productId),
  )
  // Saved state is persisted (localStorage) — render unsaved until mounted so
  // server HTML matches the first client render (hydration guard).
  const mounted = useMounted()
  const saved = mounted && inStore

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    toggle({
      productId: product.productId,
      name: product.name,
      brand: product.brand,
      price: product.lowestPrice,
      currency: product.currency,
      imageUrl: product.primaryImageUrl,
    })
  }

  const shell =
    size === 'card'
      ? 'h-8 w-8 bg-white/[.92]'
      : 'h-11 w-11 border border-border bg-secondary'
  const icon = size === 'card' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
      className={`flex items-center justify-center rounded-full transition-colors ${shell}`}
    >
      <Heart
        className={`${icon} ${saved ? 'fill-primary text-primary' : 'text-[#c8c8c4]'}`}
        aria-hidden="true"
      />
    </button>
  )
}
```

- [ ] **Step 1.4: Run the test — must pass:**

Run: `npm test -- tests/components/product/wishlist-heart.test.tsx`
Expected: 2 passed.

- [ ] **Step 1.5: Full unit suite still green:** `npm test` → all files pass (was 14 files / 71 tests; now 15 / 73).

- [ ] **Step 1.6: Commit:**

```bash
git add src/components/product/wishlist-heart.tsx tests/components/product/wishlist-heart.test.tsx
git commit -m "feat(wishlist): WishlistHeart toggle component (card + detail variants)"
```

### Task 2: Wire into card + detail, update KB, verify visually

**Files:**
- Modify: `src/components/product/product-card.tsx` (image block)
- Modify: `src/components/product/product-detail.tsx` (Add to cart row)
- Modify: `docs/kb/architecture.md` (replace the "No heart toggle exists" paragraph — KB same-commit rule)

- [ ] **Step 2.1: `product-card.tsx`** — import `WishlistHeart`; inside the image `div` (the `relative aspect-square` block), after the badge, add:

```tsx
<div className="absolute right-3 top-3 z-10">
  <WishlistHeart product={product} />
</div>
```

- [ ] **Step 2.2: `product-detail.tsx`** — import `WishlistHeart`; replace the full-width Add-to-cart `<Button>` block with a flex row (Button keeps every existing prop/text, gains `flex-1` in place of `w-full`):

```tsx
<div className="flex items-center gap-3">
  <Button
    size="lg"
    className="flex-1"
    disabled={!selectedVariant}
    onClick={handleAddToCart}
  >
    {added ? 'Added to cart!' : 'Add to cart'}
  </Button>
  <WishlistHeart product={product} size="detail" />
</div>
```

- [ ] **Step 2.3: KB (same commit):** in `docs/kb/architecture.md`, replace the paragraph beginning `**No heart toggle exists on product cards yet**` with:

```markdown
**Heart toggle** (`src/components/product/wishlist-heart.tsx`): shared client component on every `ProductCard` (top-right of the image, 32px white circle) and on the product detail page (44px, beside Add to cart). Toggles `useWishlistStore` with the `Product → WishlistItem` mapping (raw `primaryImageUrl`, resolved at render); saved state is `useMounted()`-gated; `aria-pressed` + `Save {name}` / `Remove {name} from saved` labels. No toast on toggle — feedback is the heart fill + count badges (spec decision).
```

- [ ] **Step 2.4: Verify visually** (backend on :8080 must be running; start dev with test env in ONE PowerShell command — shell state does not persist between tool calls):

```powershell
Get-Content .env.test.local | Where-Object { $_ -match '^[A-Z_]+=' -and $_ -notmatch '^#' } | ForEach-Object { $k,$v = $_ -split '=',2; [Environment]::SetEnvironmentVariable($k, $v, 'Process') }; npm run dev 2>&1
```

Check on `/products`: hearts top-right on white tiles, click fills red + header badge increments, card click still navigates; on a detail page: heart beside Add to cart, visible against dark bg; `/saved` lists saved items with image/brand/price. Kill the dev server afterwards (it blocks the E2E suite's :3001 server — Next.js refuses two dev servers per project).

- [ ] **Step 2.5: `npm run build`** → passes. **`npm run lint`** → no new errors vs the 7-error baseline.

- [ ] **Step 2.6: Commit:**

```bash
git add src/components/product/product-card.tsx src/components/product/product-detail.tsx docs/kb/architecture.md
git commit -m "feat(wishlist): heart toggle on product cards + detail page"
```

### Task 3: E2E + suite-count docs

**Files:**
- Create: `tests/e2e/wishlist.spec.ts`
- Modify: `docs/kb/testing.md:15` ("96 tests" claim), `README.md` (96/32-unique claims + wishlist feature bullet already exists)

- [ ] **Step 3.1: Write `tests/e2e/wishlist.spec.ts`** (conventions from `guest-browsing.spec.ts`: `clearState`, Loading… waits; hearts are reachable without auth):

```ts
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
```

Note: `/products` order is deterministic within a run, so `.first()` names the same product before and after reload. If the E2E-residue gotcha bites (first card is an `E2E Product` with no image — admin suite residue), SQL-delete residue first (recipe in `docs/kb`/memory); the heart itself works on any product.

- [ ] **Step 3.2: Run the new spec on chromium first:**

Run: `npx playwright test wishlist.spec.ts --project=chromium --reporter=line`
Expected: 3 passed. (Kill any :3000 dev server first.)

- [ ] **Step 3.3: Docs (same commit):** update `docs/kb/testing.md` "Expected: **96 tests pass**" → "**105 tests pass** (35 unique × 3 browsers)"; update `README.md` "96 Playwright tests (32 unique tests × chromium/firefox/webkit)" → "105 Playwright tests (35 unique tests × chromium/firefox/webkit)". Grep `96` in both files for stragglers.

- [ ] **Step 3.4: Full matrix:**

Run: `npx playwright test --reporter=line`
Expected: 105 passed (ignore any "worker did not exit" webkit warnings — known Windows quirk; watch for silent hangs via `test-results/` mtimes).

- [ ] **Step 3.5: Commit:**

```bash
git add tests/e2e/wishlist.spec.ts docs/kb/testing.md README.md
git commit -m "test(e2e): wishlist heart toggle coverage (96 -> 105 tests)"
```

### Task 4: Final verification

- [ ] **Step 4.1:** `npm test` (15 files / 73 tests), `npm run build`, `npm run lint` (baseline only) — all fresh.
- [ ] **Step 4.2:** Use superpowers:verification-before-completion — confirm every spec section shipped; report honestly.
