# Wishlist Heart Toggle — Design

**Date:** 2026-07-18
**Status:** Approved (user, 2026-07-18)
**Follow-up to:** `2026-07-17-walmal-sport-reskin-design.md` (which shipped the
wishlist store, Saved page, and count badges, but no UI to add an item)

## Problem

The wishlist pipeline is dead-ended at its entry point. `useWishlistStore`
(`walmal-wishlist`, localStorage), the `/saved` page, and the header/tab-bar
count badges all shipped with the reskin — but nothing in the UI calls
`toggle()`, so a user cannot save anything. The Saved empty state even
instructs "Tap the heart on any product", and no heart exists.

## Decision (user-approved 2026-07-18)

- **Placement:** heart on every `ProductCard` (homepage rails, `/products`
  grid, all viewports) **and** on the product detail page.
- **Feedback:** heart fill + badge increments only. **No toast** — toasts stay
  reserved for add-to-bag.

## Design

### 1. Shared component: `src/components/product/wishlist-heart.tsx`

Client component; the single source of heart behavior and styling.

```
interface WishlistHeartProps {
  product: Product          // needs productId, name; brand/lowestPrice/currency/primaryImageUrl optional
  size?: 'card' | 'detail'  // default 'card'
}
```

- Saved state: `useWishlistStore((s) => s.has(product.productId))` — but
  `has` reads via `get()`, so subscribe to `items` membership instead:
  `useWishlistStore((s) => s.items.some((i) => i.productId === product.productId))`.
- **Hydration guard:** saved state comes from localStorage; render the idle
  (unsaved) look until `useMounted()` (`src/hooks/use-mounted.ts`) returns
  true — the same rule the count badges follow (see `docs/kb/architecture.md`).
- Click handler: `e.preventDefault(); e.stopPropagation()` (the card variant
  sits inside the card's `<Link>`), then `toggle(item)` where `item` maps
  `Product` → `WishlistItem`:
  `{ productId, name, brand, price: lowestPrice, currency, imageUrl: primaryImageUrl }`.
  Raw `primaryImageUrl` — the Saved page resolves MinIO URLs at render, the
  same convention as the cart (`add-to-bag.ts`).
- A11y: `<button type="button">` with `aria-pressed={saved}` and
  `aria-label` = `Save {name}` / `Remove {name} from saved`.
- Styling (mobile wireframe annotations, applied at all viewports):
  - `card`: 32px circle, `bg-white/[.92]`, lucide `Heart` 16px; idle
    `#c8c8c4`, saved `fill-primary text-primary`.
  - `detail`: 44px, same circle treatment sized up (icon 20px).

### 2. Call sites

- **`product-card.tsx`**: heart absolutely positioned top-right of the image
  (`absolute right-3 top-3 z-10`). The badge already owns top-left — no
  overlap. Card stays a `Link`-wrapped tile; the heart's stopPropagation
  keeps card navigation intact.
- **`product-detail.tsx`**: wrap the existing full-width "Add to cart" button
  in a flex row — button becomes `flex-1`, heart (`size="detail"`) sits
  beside it.

### 3. Store

No changes. `toggle`/`remove`/`has` exist and are unit-tested
(`tests/store/wishlist-store.test.ts`).

## Error handling

None required: the store is synchronous localStorage state; there is no
network path. Products without `lowestPrice`/`primaryImageUrl` save fine —
`WishlistItem` fields are optional and the Saved page already renders
placeholder boxes and hides missing prices.

## Testing

- **Component (vitest):** `tests/components/product/wishlist-heart.test.tsx` —
  toggle adds/removes the item in the store; `aria-pressed` reflects state;
  mapping carries brand/price/imageUrl.
- **E2E (Playwright):** new `tests/e2e/wishlist.spec.ts`, ~3 tests:
  1. Save from a `/products` card → header heart badge shows 1 → `/saved`
     lists the product.
  2. Remove on `/saved` → empty state ("Nothing saved yet").
  3. Saved state persists across reload (heart still filled, badge still 1).
- **Same-commit doc updates:** suite count claims ("96 tests", "32 unique")
  in `README.md` and `docs/kb/testing.md`; replace the "no heart toggle
  exists" paragraph in `docs/kb/architecture.md`.

## Out of scope

Server-side wishlist, toasts on toggle, hearts on the cart drawer or Saved
page rows (Saved already has Remove), and any listing/detail page redesign
beyond the heart itself.
