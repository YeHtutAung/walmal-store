# Shop/Bag Screen Reskins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/products` (breadcrumb header, client-side Brand/Max-price filters, sort, mobile category chips, stars on cards) and `/cart` ("Your Bag" two-column page with free-delivery progress) per the approved Claude Design concepts — drawer untouched, all existing E2E contracts preserved.

**Architecture:** Two pure TDD'd modules (`listing-filters.ts`, `free-delivery.ts`) carry all decision logic; the pages are thin renderers over them. Filters/sort are client-side over the loaded results (spec decision — no backend work). Summary shows only Subtotal/Total (never uncharged fees).

**Tech Stack:** Next.js App Router, Zustand cart store (unchanged), vitest, Playwright.

**Reference:** Spec `docs/superpowers/specs/2026-07-18-shop-bag-reskin-design.md` (read it first — it pins every invariant, edge case, and layout value). Repo: `C:/YHA/006_Claude_Workspace/walmal-store`.

**Hard invariants (from spec):** heading semantics ("Products"/category name), `?q=`/`?category=` contracts, `Loading…` text, count text matching `/\d+ products/` within one element, `data-testid="product-card"`/`product-card-link`, cart drawer untouched, TC-E2E-001..037 pass unmodified.

---

### Task 1: `listing-filters.ts` (TDD)

**Files:**
- Create: `src/lib/listing-filters.ts`
- Test: `tests/lib/listing-filters.test.ts`

- [ ] **Step 1.1: Failing tests:**

```ts
import { describe, expect, it } from 'vitest'
import { deriveBrandFacets, applyFilters, sortProducts, type ListingSort } from '@/lib/listing-filters'
import type { Product } from '@/types/product'

const p = (productId: string, name: string, brand?: string, lowestPrice?: number): Product =>
  ({ productId, name, slug: productId, brand, lowestPrice })

const CATALOG = [
  p('1', 'Velocity Elite FG Boot', 'Walmal Pro', 1199.99),
  p('2', 'Grip Training Socks', 'Walmal Sport', 22),
  p('3', 'Match Ball', 'Walmal Sport', 79),
  p('4', 'Mystery Item', undefined, 10),
  p('5', 'Unpriced Boot', 'Walmal Pro', undefined),
]

describe('deriveBrandFacets', () => {
  it('counts per brand, sorted by count desc then name, excluding undefined brands', () => {
    expect(deriveBrandFacets(CATALOG)).toEqual([
      { brand: 'Walmal Pro', count: 2 },
      { brand: 'Walmal Sport', count: 2 },
    ])
  })
})

describe('applyFilters', () => {
  it('is a no-op with no active filters', () => {
    expect(applyFilters(CATALOG, { brands: new Set(), maxPrice: null })).toEqual(CATALOG)
  })
  it('filters by brand; undefined brand is filtered out when a brand filter is active', () => {
    const out = applyFilters(CATALOG, { brands: new Set(['Walmal Sport']), maxPrice: null })
    expect(out.map((x) => x.productId)).toEqual(['2', '3'])
  })
  it('filters by max price; unknown price is filtered out when a cap is active', () => {
    const out = applyFilters(CATALOG, { brands: new Set(), maxPrice: 80 })
    expect(out.map((x) => x.productId)).toEqual(['2', '3', '4'])
  })
})

describe('sortProducts', () => {
  it('featured preserves input order', () => {
    expect(sortProducts(CATALOG, 'featured')).toEqual(CATALOG)
  })
  it('price-asc sorts cheapest first, missing price last', () => {
    expect(sortProducts(CATALOG, 'price-asc').map((x) => x.productId)).toEqual(['4', '2', '3', '1', '5'])
  })
  it('price-desc sorts dearest first, missing price last', () => {
    expect(sortProducts(CATALOG, 'price-desc').map((x) => x.productId)).toEqual(['1', '3', '2', '4', '5'])
  })
  it('name sorts A-Z and does not mutate the input', () => {
    const input = [...CATALOG]
    const out = sortProducts(input, 'name')
    expect(out.map((x) => x.name)[0]).toBe('Grip Training Socks')
    expect(input).toEqual(CATALOG)
  })
})
```

- [ ] **Step 1.2:** `npm test -- tests/lib/listing-filters.test.ts` → FAIL (module not found).
- [ ] **Step 1.3: Implement:**

```ts
import type { Product } from '@/types/product'

export type ListingSort = 'featured' | 'price-asc' | 'price-desc' | 'name'

export interface ListingFilters {
  brands: Set<string>
  maxPrice: number | null
}

export function deriveBrandFacets(products: Product[]): { brand: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const p of products) {
    if (p.brand) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand))
}

export function applyFilters(products: Product[], { brands, maxPrice }: ListingFilters): Product[] {
  return products.filter((p) => {
    // An unknown brand/price cannot be proven to match an active filter — filter it out.
    if (brands.size > 0 && (!p.brand || !brands.has(p.brand))) return false
    if (maxPrice != null && (p.lowestPrice == null || p.lowestPrice > maxPrice)) return false
    return true
  })
}

export function sortProducts(products: Product[], sort: ListingSort): Product[] {
  if (sort === 'featured') return products
  const missingLast = (v: number | undefined) => v ?? Number.POSITIVE_INFINITY
  const out = [...products]
  if (sort === 'price-asc') out.sort((a, b) => missingLast(a.lowestPrice) - missingLast(b.lowestPrice))
  else if (sort === 'price-desc')
    out.sort(
      (a, b) =>
        (b.lowestPrice ?? Number.NEGATIVE_INFINITY) - (a.lowestPrice ?? Number.NEGATIVE_INFINITY),
    )
  else out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}
```

- [ ] **Step 1.4:** Tests PASS; full `npm test` green (16 files / 81 tests).
- [ ] **Step 1.5: Commit** `feat(listing): pure filter/sort/facet helpers`

### Task 2: `free-delivery.ts` (TDD)

**Files:**
- Create: `src/lib/free-delivery.ts`
- Test: `tests/lib/free-delivery.test.ts`

- [ ] **Step 2.1: Failing tests:**

```ts
import { describe, expect, it } from 'vitest'
import { FREE_DELIVERY_THRESHOLD, freeDeliveryProgress } from '@/lib/free-delivery'

describe('freeDeliveryProgress', () => {
  it('threshold matches the announced $80', () => {
    expect(FREE_DELIVERY_THRESHOLD).toBe(80)
  })
  it('under threshold: not qualified, remaining and pct computed', () => {
    expect(freeDeliveryProgress(22)).toEqual({ qualifies: false, remaining: 58, pct: 27.5 })
  })
  it('at threshold: qualifies, zero remaining, 100 pct', () => {
    expect(freeDeliveryProgress(80)).toEqual({ qualifies: true, remaining: 0, pct: 100 })
  })
  it('over threshold clamps pct to 100', () => {
    expect(freeDeliveryProgress(1199.99)).toEqual({ qualifies: true, remaining: 0, pct: 100 })
  })
  it('zero subtotal: 0 pct, full remaining', () => {
    expect(freeDeliveryProgress(0)).toEqual({ qualifies: false, remaining: 80, pct: 0 })
  })
})
```

- [ ] **Step 2.2:** FAIL → **implement** (threshold constant carries a comment tying it to the announcement-bar copy):

```ts
/** Matches the announcement bar's "Free local delivery over $80" — change both together. */
export const FREE_DELIVERY_THRESHOLD = 80

export function freeDeliveryProgress(subtotal: number): {
  qualifies: boolean
  remaining: number
  pct: number
} {
  const qualifies = subtotal >= FREE_DELIVERY_THRESHOLD
  return {
    qualifies,
    remaining: qualifies ? 0 : Math.round((FREE_DELIVERY_THRESHOLD - subtotal) * 100) / 100,
    // Rounded to one decimal — raw division gives 27.500000000000004 for $22
    // (floating point) and the value only feeds a CSS width.
    pct: Math.round(Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100) * 10) / 10,
  }
}
```

- [ ] **Step 2.3:** Tests PASS; suite green (17 files / 86 tests).
- [ ] **Step 2.4: Commit** `feat(cart): free-delivery progress helper`

### Task 3: Listing page rebuild

**Files:**
- Create: `src/components/listing/filter-sidebar.tsx`, `src/components/listing/listing-toolbar.tsx`, `src/components/listing/category-chip-rail.tsx`
- Modify: `src/app/(shop)/products/page.tsx`
- Maybe delete: `src/components/product/product-grid.tsx` (Step 3.4)
- Modify: `docs/kb/architecture.md` (same commit)

Layout values come from the spec's Part A (which mirrors `Walmal Sport Listing.dc.html`). Structural requirements:

- [ ] **Step 3.1: Components** (all client):
  - `filter-sidebar.tsx` — props `{ facets, brands, maxPrice, priceCeiling, onToggleBrand, onSetMaxPrice, onClearAll }`. Renders: "Filters" caps label + "Clear all" underline button; active-chips row (brand chips + `Under $X` chip, each with × calling its remover) only when a filter is active; Brand group (18px rounded checkbox — red `bg-primary` fill + ✓ when on, `border-[#3a3a42]` idle — name, count); Max price group (`<input type="range" min={0} max={priceCeiling} step={10}>` with red `accent-primary`, label `Max price — ${'$'+v}` or `Any` at ceiling, `$0`/`$ceiling` ends row). Hidden below `lg:`.
  - `listing-toolbar.tsx` — props `{ count, sort, onSetSort }`. Left: `<span className="text-[13.5px] text-muted-foreground"><b className="font-bold text-foreground">{count}</b> products</span>` — **the number and the word "products" MUST stay in this one span** (TC-E2E-003 matches `/\d+ products/`). Right: `Sort` label + dark `<select>` (`bg-secondary border-input rounded-[9px]` label-caps) with options Featured / Price: Low to High / Price: High to Low / Name: A–Z (`featured|price-asc|price-desc|name`).
  - `category-chip-rail.tsx` — mobile only (`lg:hidden`): horizontal scroll rail of Links — All → `/products`, then the four categories → `/products?category=<slug>`; active chip (match current `categorySlug`, All active when none) red `bg-primary`, others `bg-secondary border-[#26262c] text-[#c9c9cf]`; same chip classes as `category-tiles.tsx`'s mobile rail; hide scrollbar with the `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden` trick.
- [ ] **Step 3.2: Rebuild `products/page.tsx` render** (data flow, effect, heading resolution, `getTree` cache all UNCHANGED — only state + render additions):
  - New state: `const [brands, setBrands] = useState<Set<string>>(new Set())`, `const [maxPrice, setMaxPrice] = useState<number | null>(null)`, `const [sort, setSort] = useState<ListingSort>('featured')`.
  - Derived (plain code, no effect): `facets = deriveBrandFacets(data?.products ?? [])`; `priceCeiling = Math.ceil(Math.max(0, ...prices) / 100) * 100 || 100` where prices = defined `lowestPrice`s; `shown = sortProducts(applyFilters(data?.products ?? [], { brands, maxPrice }), sort)`.
  - Reset filters when the query context changes: inside the existing effect (after the guard), `setBrands(new Set()); setMaxPrice(null)` — same eslint-disable block treatment as the existing `setLoading/setError` pair. (The effect's deps include `status`, so the reset also fires on auth transitions — matches the existing reset treatment; leave as is.) `sort` is deliberately NOT reset — it's a presentation preference, not a filter.
  - Render: bordered page-header band (breadcrumb `Home / {heading}` — Home is a `Link` to `/`; Archivo 12px caps `text-[#6b6b73]`) + `display-heading` h1 `text-[34px] lg:text-[56px]` `{heading}` (text semantics unchanged); then `max-w-[1360px]` body grid `lg:grid-cols-[248px_1fr] gap-9`; sidebar (desktop) / chip rail (mobile); toolbar; card grid `grid grid-cols-2 gap-[13px] lg:grid-cols-3 lg:gap-5` mapping `shown` → `<ProductCard product={p}>` with the same decorative-star `children` row `best-sellers.tsx` uses; filter empty state (Anton "No matches" + copy + red "Clear filters" button) when `data && shown.length === 0 && data.products.length > 0`; keep `Loading…`/error exactly.
  - Keep the Suspense fallback as is.
- [ ] **Step 3.3: KB (same commit):** in `docs/kb/architecture.md` route-table `/products` entry, append the filter model facts: client-side Brand/Max-price/Sort over the loaded page (spec decision, not a bug), facets derived from results, filters reset on query change, mobile = category chips only, stars decorative, count-span selector constraint.
- [ ] **Step 3.4: ProductGrid check:** `grep -rn "ProductGrid" src/` — if `products/page.tsx` was its last consumer, delete `src/components/product/product-grid.tsx` in this commit (KB lists no such component fact; verify with grep in docs/kb).
- [ ] **Step 3.5: Verify:** run affected E2E on chromium: `npx playwright test guest-browsing.spec.ts wishlist.spec.ts --project=chromium` → 13 passed (no dev server on :3000!). Then visual check (test-env dev server, temp Playwright script, DELETE after; kill :3000 when done): desktop 1440 — sidebar, toolbar, 3-up grid with stars, brand filter narrows + chips appear, slider filters, Clear all restores, `/products?category=boots` heading "Boots" + breadcrumb; mobile 390 — chip rail, 2-up grid, no sidebar. Read the screenshots.
- [ ] **Step 3.6:** `npm run build` + `npm test` green; lint no new errors vs 7-error baseline.
- [ ] **Step 3.7: Commit** `feat(listing): sport listing page — filters, sort, breadcrumb header, mobile chips`

### Task 4: Bag page rebuild

**Files:**
- Create: `src/components/cart/bag-line-item.tsx`, `src/components/cart/bag-summary.tsx`
- Modify: `src/app/(checkout)/cart/page.tsx`
- Modify: `docs/kb/architecture.md` (same commit)

The drawer (`cart-drawer.tsx`, `cart-item.tsx`, `cart-summary.tsx`) is UNTOUCHED.

- [ ] **Step 4.1: `bag-line-item.tsx`** (client; props `{ item: CartItem }`; store actions via `useCartStore`): row `flex gap-3.5 lg:gap-5 py-4 lg:py-6 border-t border-[#1a1a1e]` — image 80px (118px at lg) rounded `bg-[#f1f1ee]` via `resolveMinioUrl(item.imageUrl) ?? item.imageUrl` with placeholder box when falsy; middle column: name (14px/17px w700), `variantName` meta line (`text-[12px] text-[#8a8a90]`), bottom row qty stepper (bordered `rounded-[9px] bg-card`: − / qty / + buttons 32-38px, − **disabled at qty 1** — never calls `updateQty(v, 0)`; aria-labels "Decrease quantity"/"Increase quantity") + underlined "Remove" (`removeItem`); right: Anton line total `formatPrice(price*qty)` + `"{formatPrice(price)} each"` small line when qty > 1.
- [ ] **Step 4.2: `bag-summary.tsx`** (client; reads `useCart()`): `bg-card border border-border rounded-2xl p-5 lg:p-7 lg:sticky lg:top-24` — "Order summary" caps title; Subtotal row; then `freeDeliveryProgress(subtotal)`: if `!qualifies` → 6px `bg-[#26262c]` track with red fill at `pct%` + caption `Add {formatPrice(remaining)} more for free local delivery.`; if `qualifies` → row `Delivery` / green (`text-[#4caf6e]`) `Free`; bordered Total row (Anton 30px) where **Total renders the subtotal**; disclaimer `Shipping and taxes calculated at checkout.`; red full-width `Checkout →` Link → `/checkout` (label-caps, h-14 rounded-xl); green-dot `Secure encrypted checkout` line; VISA / MC / AMEX static chips (`text-[10px] label-caps bg-[#1c1c21] border border-[#26262c] rounded-md px-2 py-1.5 text-[#8a8a90]`).
- [ ] **Step 4.3: Rebuild `cart/page.tsx`:** keep `'use client'` + SiteHeader/SiteFooter composition. Gate the whole items/empty branch behind `useMounted()` (persisted store — render nothing pre-mount; same rule as `/saved`). Breadcrumb `Home / Bag` + `display-heading` h1 `Your Bag <span className="text-[#3a3a42]">({itemCount})</span>` (34px/56px). Filled: grid `lg:grid-cols-[1fr_384px] gap-10`; left = "Item / Total" caps header row + `BagLineItem` list + `← Continue shopping` link → `/products`; right = `BagSummary`. Empty: centered Anton "Your bag is empty" + `Looks like you haven't added anything yet. Let's fix that.` + red `Shop the store` → `/products`.
- [ ] **Step 4.4: KB (same commit):** architecture.md route-table `/cart` entry → describe the Bag page (two-column, qty stepper min 1, free-delivery progress from `src/lib/free-delivery.ts` — threshold coupled to announcement copy, Total = Subtotal only (spec decision: never show uncharged fees), mounted-gated, drawer unchanged).
- [ ] **Step 4.5: Verify visually** (same dev-server pattern; kill :3000 after): seed cart via localStorage with a $22 item → progress bar + caption; $1,199.99 item → green Free row; qty stepper +/− updates line + subtotal; − disabled at 1; Remove → empty state; 390px single column. Read screenshots.
- [ ] **Step 4.6:** `npm run build`, `npm test`, lint baseline. Chromium drawer specs still green: `npx playwright test guest-browsing.spec.ts --project=chromium` → 10 passed.
- [ ] **Step 4.7: Commit** `feat(cart): Your Bag page — line items, free-delivery progress, sport summary`

### Task 5: E2E + doc counts

**Files:**
- Create: `tests/e2e/listing-and-bag.spec.ts`
- Modify: `docs/kb/testing.md`, `README.md`

- [ ] **Step 5.1: Write the spec** (TC-E2E-038..041; conventions: `clearState`, `Loading…` waits, `seedCart` from helpers):
  - **038 brand filter:** `/products`, wait for load, read initial count from `text=/\d+ products/`; check the first brand checkbox in the sidebar; expect count text changes to the facet's count and every visible card's brand text matches; "Clear all" restores the original count.
  - **039 sort:** `/products`, select `Price: Low to High`; expect the first `[data-testid="product-card"]`'s price text to be `$22.00` (Grip Training Socks — cheapest seeded product).
  - **040 bag page basics:** seed one item (`variantId: '20000000-0000-0000-0000-000000000025'`, name `Grip Training Socks`, price 22, qty 1), goto `/cart`; expect h1 `Your Bag (1)`, the row, `+` click → line total `$44.00` and h1 `(2)`; `Remove` → `Your bag is empty` + `Shop the store` link.
  - **041 free-delivery messaging:** seed the $22 item → caption `Add $58.00 more for free local delivery.` visible; `clearState`, seed a $1,199.99 item → `Free` visible in the summary and no "more for free" text.
  - Desktop-viewport note in the header comment: the sidebar is `lg:`-only and Playwright's default viewport is desktop.
  - `seedCart` uses `page.evaluate` — navigate somewhere (e.g. `page.goto('/')`) BEFORE calling it, per the existing checkout-spec convention.
- [ ] **Step 5.2:** `npx playwright test listing-and-bag.spec.ts --project=chromium --reporter=line` → 4 passed (debug via error-context.md before proceeding).
- [ ] **Step 5.3: Docs (same commit):** README + `docs/kb/testing.md`: `105 tests (35 unique × 3 browsers)` → `117 tests (39 unique × 3 browsers)`; README intro "105-test Playwright suite" → "117-test". Grep both files for `105` stragglers.
- [ ] **Step 5.4: Full matrix:** `npx playwright test --reporter=line` → **117 passed** (webkit worker-exit warnings are benign; watch for silent hangs via `test-results/` mtimes).
- [ ] **Step 5.5: Commit** `test(e2e): listing filters + bag page coverage (105 -> 117 tests)`

### Task 6: Final verification

- [ ] **Step 6.1:** Fresh `npm test` (17 files / 86 tests), `npm run build`, `npm run lint` (7-error baseline only).
- [ ] **Step 6.2:** Use superpowers:verification-before-completion — every spec section shipped or explicitly out-of-scope; report honestly.
