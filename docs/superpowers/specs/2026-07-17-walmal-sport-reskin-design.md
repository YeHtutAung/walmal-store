# Walmal Sport reskin — design

**Date:** 2026-07-17
**Status:** Approved by user (brainstorming session)
**Source design:** Claude Design project "Walmart store UI improvements"
(`https://claude.ai/design/p/62cb12d5-c536-47be-942b-393acc3088fd`), files
`Walmal Sport.dc.html` (desktop home) and `Walmal Sport Mobile.dc.html`
(mobile home + app chrome). Listing/Product/Cart/Checkout wireframes in the
same project are **out of scope** (follow-up work).

## Summary

Rebrand the storefront as **WALMAL SPORT** — a football/sports shop — with a
dark visual theme, and rebuild the homepage to the new wireframes. The Spring
backend catalog is reseeded in place as a sports catalog so homepage sections
show real data. Other storefront pages keep their current layouts but inherit
the new dark theme via the shadcn token system.

## Decisions (locked with user)

1. **Scope:** global theme + homepage rebuild + global chrome (header, footer,
   mobile drawer, mobile bottom tab bar, Saved page). Listing/Product/Cart/
   mobile-Checkout wireframes are a follow-up.
2. **Catalog:** full sports rebrand — reseed the backend as a sports store.
3. **Test data:** rename seeded products/variants **in place** (same UUIDs,
   same prices); add new sports products alongside. Minimal test churn.
4. **Features with no backend:** decorative for now — deterministic seeded
   star ratings, local-only wishlist, newsletter form with success toast only.
   Documented as such in the KB; real backend support is backlog.
5. **Theming approach:** retarget the shadcn CSS variables globally
   (approach A). No parallel theme, no hardcoded page-local palettes.
6. **Accent:** red `#e0281b` only. The wireframe's alternate accent options
   (lime/blue/yellow) are a design-tool affordance, not shipped.

## Part 1 — Theme foundation and global chrome (walmal-store)

### Tokens (`src/app/globals.css`)

Remap `:root` to the Walmal Sport palette; delete the `.dark` block (single
always-dark theme):

- `background` `#0c0c0e`, `foreground` `#f4f4f2`
- `primary` `#e0281b`, `primary-foreground` white
- `secondary` / `muted` `#17171b`, `muted-foreground` `#9a9a9f`
- `card` `#141418` (dark panel), `border` `#1e1e22`, `input` `#26262c`
- Radii stay on the existing `--radius` scale (design uses ~9–14px)

**Deliberate exception:** the design's white product tiles are an inverted
treatment styled explicitly in the product-card components
(`bg-white text-neutral-900`), NOT via `--card`. Dialogs, cart drawer,
checkout panels, and summaries stay dark through the token.

### Typography (`next/font/google`)

- **Public Sans** → `--font-sans` (body)
- **Anton** → `--font-heading` (uppercase display headings)
- **Archivo** → new `--font-label` (bold uppercase labels/buttons/badges)
- Two utility classes: `display-heading` (Anton, uppercase, tight leading)
  and `label-caps` (Archivo 800, uppercase, letter-spacing) to avoid
  re-typing the treatment.

### Global chrome components

- **Announcement bar** — static red strip: "Free local delivery over $80 ·
  Worldwide shipping available".
- **Desktop header** (rebuild `site-header.tsx`) — sticky, blur backdrop,
  WALMAL**SPORT** logo (SPORT in red, Anton), category nav links →
  `/products?category=<slug>`, search input submitting to
  `/products?search=<q>`, wishlist heart (count from wishlist store),
  auth area preserving current behavior exactly (Sign in / Register vs
  "Hi, username" / Sign out — E2E depends on it), red **Bag** button with
  item count opening the existing `CartDrawer`.
- **Mobile header** — hamburger opening a full-height menu drawer (category
  links, Account/Help links), centered logo, heart with saved-count badge.
- **Mobile bottom tab bar** — sticky: Home `/`, Shop `/products`, Saved
  `/saved`, Bag (opens cart drawer). Count badges on Saved and Bag.
- **Saved page `/saved`** — local-only wishlist: new Zustand persisted store
  (pattern mirrors the cart store), row layout per mobile wireframe
  ("Add to bag" / Remove), empty state with heart illustration and
  "Start shopping" CTA.
- **Footer** (rebuild `site-footer.tsx`) — desktop: brand + newsletter form
  (client-side success toast only) + Shop / Help / Stores link columns;
  mobile: compact centered variant per wireframe.

## Part 2 — Homepage (`src/app/(shop)/page.tsx`)

Desktop layout per `Walmal Sport.dc.html`; responsive behavior per the
mobile wireframe's Home screen. Data via existing `fetchProductsSSG`, ISR
`revalidate = 3600`, images through the existing MinIO proxy. Backend down
at build time → sections render with empty rails (current behavior kept).

Sections top-to-bottom:

1. **Hero** — 600px desktop / 460px mobile (text bottom-anchored on mobile).
   Static generated illustration asset in `/public` (flat style consistent
   with product art). Copy: "26/27 Season Drop / Own the pitch." CTAs:
   "Shop new arrivals" → `/products`, "Shop boots" → `/products?category=boots`.
2. **Category tiles** — 4-up grid desktop (tile illustration + name +
   "Shop now →"); horizontal chip rail on mobile. Links to filtered listing.
3. **New Arrivals rail** — horizontal scroll, 6 newest real products,
   white tiles, red "New" badge, brand/name/price, Add button.
4. **Promo banner** — static "The Velocity Elite Pack" limited-release
   banner, own illustration, CTA → boots listing.
5. **Best Sellers grid** — 4×2 desktop, 2-up mobile; next 8 real products.
   Decorative star ratings + review counts derived deterministically from
   the product ID (stable across renders). Badges ("Best seller",
   "Authentic", "-15%") from a small static config map keyed by product name.
6. **Trust bar** — static 3 items (free local delivery / worldwide
   shipping / secure payment).

**Add-button rule:** single-variant product → add directly to cart with a
toast; multi-variant product → navigate to product detail (variant selector
lives there). Card click always navigates to detail. This adapts the
wireframe honestly to sized products.

## Part 3 — Backend reseed (walmal repo)

### Migration `V17__reseed_sports_catalog.sql`

- **UPDATE in place** (same UUIDs, same prices):
  - Categories become the sports taxonomy: Jerseys, Boots, Teamwear,
    Equipment (slugs updated to match).
  - Existing seeded products/variants become sports products. Test-critical
    variants keep UUID + price:
    - `20000000-0000-0000-0000-000000000001` → premium limited-edition boot
      (e.g. "Velocity Elite FG Boot — UK 9") at $1,199.99
    - `20000000-0000-0000-0000-000000000002` → its sibling variant at
      $1,419.99
- **INSERT ~10 new products** across the 4 categories at design prices
  (jerseys $115–189, boots $319–449, match ball $79, shinguards $45 …),
  with size variants, stock rows at the default location, idempotent
  `ON CONFLICT DO NOTHING`.

### Product images

Extend the existing idempotent `walmal/scripts/seed-product-images.ps1`
pattern: generate flat-illustration sports images, upload to MinIO
`product-images` bucket, set `storage_key` per product. Hero / promo /
category-tile art are frontend static assets in `/public` (not MinIO).

## Testing

- **Store E2E (96 Playwright tests):** update assertions referencing old
  product names/SKUs; keep existing `data-testid` conventions on rebuilt
  components so selectors still bind. Full chromium+firefox+webkit run must
  pass before completion.
- **k6:** variant UUIDs and prices unchanged → no changes expected;
  smoke-check one scenario.
- **Admin E2E:** creates its own products; unaffected.
- **Unit (vitest):** new wishlist store gets unit tests; rate-limit tests
  unaffected.

## Docs / KB (maintenance rule)

- `walmal-store/docs/kb/`: theme/branding, homepage architecture, Saved
  wishlist (local-only), decorative ratings/newsletter documented as
  non-backend features.
- `walmal/docs/kb/` + `walmal/docs/kb/SYSTEM.md`: seeded catalog facts
  (test-profile variant names/SKUs documented there change with V17).
- READMEs (store + walmal): catalog/screenshot claims updated same-commit;
  store README screenshots re-captured after the reskin.

## Out of scope / backlog

- Listing, Product detail, Cart, mobile Checkout wireframes (same Design
  project) — next iteration.
- Real reviews/ratings, server-side wishlist, newsletter subscription
  backend.
- Accent color theming beyond red.
