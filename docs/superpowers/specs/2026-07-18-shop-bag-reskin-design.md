# Shop/Bag Screen Reskins — Design

**Date:** 2026-07-18
**Status:** Approved (user, 2026-07-18)
**Follow-up to:** `2026-07-17-walmal-sport-reskin-design.md` (which scoped the
listing and cart pages to inherited theme only) and
`2026-07-18-wishlist-heart-toggle-design.md`.

**Reference designs (Claude Design project "Walmart store UI improvements"):**
- `Walmal Sport Listing.dc.html` — desktop listing concept
- `Walmal Sport Cart.dc.html` — desktop bag concept
- `Walmal Sport Mobile.dc.html` — SHOP and BAG screens (mobile)

The concepts are richer than the backend supports. Three user decisions
(2026-07-18) resolve every gap:

1. **Filters:** client-side over the loaded results, real facets only —
   Brand, Max price, Sort. No boot-type/size facets (variant attributes are
   not in the search DTO), no backend work.
2. **Summary:** Subtotal + free-delivery progress bar + Total = Subtotal.
   **Never display charges (tax/fees) that Stripe does not collect.**
3. **Bag scope:** reskin the `/cart` page; the cart drawer keeps its current
   role untouched. Tab-bar Bag still opens the drawer.

## Part A — Listing page (`/products`)

### Invariants (E2E + KB contracts — must not change)

- `?q=` and `?category=<slug>` behavior exactly as documented in
  `docs/kb/architecture.md`.
- h1 text semantics: "Products" unfiltered, category name when `?category=`
  resolves (TC-E2E-002 asserts the heading; the category test asserts names).
- The literal `{count} products` text (TC-E2E-003 asserts `/\d+ products/`).
- `Loading…` text, `data-testid="product-card"` / `product-card-link`.
- TC-E2E-002..009 and TC-E2E-035..037 must pass unmodified.

### Layout (desktop ≥ lg, per the Listing concept)

- **Page header** (own bordered band): breadcrumb `Home / {heading}`
  (Archivo 12px caps; Home links to `/`), Anton 56px uppercase h1.
- **Body**: `max-w-[1360px]` grid `248px 1fr` gap 36px.
- **Filter sidebar** (sticky below header):
  - "Filters" label + "Clear all" underline button.
  - Active chips row (dark pills with ×) when any filter is active.
  - **Brand** group: checkbox rows (18px rounded box, red fill + ✓ when on)
    with per-brand counts — derived from the currently loaded products.
  - **Max price** group: range slider (`accent-color` red), min $0,
    max = catalog ceiling rounded up to the next $100; label "Any" at max.
- **Toolbar** (above grid): `**N** products` + Sort select (dark
  `bg-secondary` select, Archivo caps): Featured (API order) /
  Price: Low to High / Price: High to Low / Name: A–Z. No "Newest" —
  the search DTO has no `createdAt`.
- **Grid**: 3-up (2-up below lg) of the existing `ProductCard`, passing a
  decorative star row as `children` (same `decorativeRating` helper and
  markup as `best-sellers.tsx`).
- **Empty state**: when filters produce zero results — Anton "No matches",
  "Try widening your filters or raising the max price.", red "Clear filters"
  button. The existing no-results path for a `?q=` miss stays as is.

### Mobile (< lg, per the mobile SHOP screen)

- Same h1/count header (Anton 34px).
- **Category chip rail** replaces the sidebar: All → `/products`, then the
  four category chips → `/products?category=<slug>`; active chip red.
  (Reuses the same chip styling as `category-tiles.tsx`'s mobile rail.)
- Sort select remains in the toolbar. No brand/price UI on mobile
  (concept shows none).

### Filtering model (client-side, spec decision)

- Filters and sort apply **client-side to the currently loaded results**
  (the response page). The dev catalog fits one page (15 products,
  size 20), so this is complete in practice; with a larger catalog it
  filters within the page. Documented in KB — do not read it as a bug.
- Server-side pagination stays as is; changing filters does not refetch.
- New pure module `src/lib/listing-filters.ts` (TDD):
  - `deriveBrandFacets(products) → { brand, count }[]` (sorted by count
    desc, then name)
  - `applyFilters(products, { brands: Set<string>, maxPrice: number | null })`
  - `sortProducts(products, sort)` — `'featured' | 'price-asc' |
    'price-desc' | 'name'`; `featured` returns the input order; missing
    `lowestPrice` sorts last.

## Part B — Bag page (`/cart`)

### Layout (desktop, per the Cart concept)

- Breadcrumb `Home / Bag` + Anton 56px h1 `Your Bag (N)` (N = quantity sum,
  muted `#3a3a42` parens span).
- **Two-column** `1fr 384px` gap 40px:
  - **Line items**: "Item / Total" caps header row; each row = 118px
    rounded image (`resolveMinioUrl`, placeholder box when none), product
    name (17px w700), `variantName` as the meta line (cart items carry no
    brand — show nothing rather than fake it), qty stepper (bordered
    `−  n  +`, wired to existing `updateQty`; min 1 via the store's
    remove-at-0 semantics is NOT used here — the − button stops at 1),
    underlined "Remove" (existing `removeItem`), right column Anton 22px
    line total + `"$X.XX each"` small line when qty > 1.
    "← Continue shopping" link → `/products` below the list.
  - **Summary card** (sticky, `bg-card border rounded-2xl`):
    "Order summary" caps title; `Subtotal` row; free-delivery progress
    (see below); `Total` row (Anton 30px) where **Total = Subtotal**;
    "Shipping and taxes calculated at checkout." disclaimer (same copy the
    drawer uses today); full-width red `Checkout →` link → `/checkout`;
    green-dot "Secure encrypted checkout" line; static VISA / MC / AMEX
    chips (decorative text badges).
- **Free-delivery progress** (under $80 only): 6px track + red fill at
  `min(100, subtotal/80*100)%`, caption `Add $X.XX more for free local
  delivery.` At ≥ $80 the bar hides and the summary shows a green
  `Delivery — Free` row instead. The $80 threshold matches the announcement
  bar copy; constant lives in new `src/lib/free-delivery.ts` (TDD):
  `freeDeliveryProgress(subtotal) → { qualifies, remaining, pct }`.
- **Empty state**: Anton "Your bag is empty", "Looks like you haven't added
  anything yet. Let's fix that.", red "Shop the store" → `/products`.

### Mobile (per the mobile BAG screen)

Single column: 80px images, same row anatomy (smaller sizes), summary card
inline after the rows, full-width "Checkout →" CTA, secure line. No sticky.

### Out of scope for Part B

The cart drawer (all TC-E2E-006..010 flows), checkout, tax/fee lines,
promo codes, and any qty-max enforcement beyond the current store behavior.

## Hydration

The `/cart` page reads the persisted cart store — the whole item/empty
branch renders behind `useMounted()` (same rule as `/saved`; see
`docs/kb/architecture.md`).

## Testing

- **Unit (vitest, TDD):** `tests/lib/listing-filters.test.ts` (facets,
  filtering incl. empty-set no-op, all four sorts, missing-price ordering)
  and `tests/lib/free-delivery.test.ts` (under/at/over threshold, pct
  clamping, zero subtotal).
- **E2E (Playwright):** new `tests/e2e/listing-and-bag.spec.ts`,
  TC-E2E-038..041:
  1. Brand filter narrows the grid and the `N products` count; Clear all
     restores it.
  2. Sort by Price: Low to High reorders the first card to the cheapest.
  3. `/cart` page: seeded item renders (name, qty stepper), + increments
     the line total, Remove empties to "Your bag is empty".
  4. Free-delivery messaging: seeded $22 item shows the progress caption;
     seeded $1,199.99 item shows `Free`.
- Existing suites (105) must pass unmodified — the listing invariants above
  are the guardrail.
- **Same-commit docs:** suite counts (105 → 117, 35 → 39 unique) in
  `README.md` + `docs/kb/testing.md`; `docs/kb/architecture.md` gains the
  listing filter model + Bag page sections and drops any "theme-inherit
  only" claims about these pages.

## Out of scope (whole feature)

Backend facet/sort/price APIs, boot-type/size facets, tax/delivery-fee
charging, drawer redesign, product-detail redesign, "Lifestyle"/"Sale" nav
items from the concepts, pagination redesign beyond inherited styling.
