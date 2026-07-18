# walmal-store — Architecture

> Cross-repo facts (ports, auth contract, env vars, error bodies): `../walmal/docs/kb/SYSTEM.md`.

## Page Routes (`src/app/`)

| Route group / path | URL(s) |
|--------------------|--------|
| `(shop)/page.tsx` | `/` (home) |
| `(shop)/products/` | `/products`, `/products/[slug]` |
| `(shop)/saved/` | `/saved` — wishlist page; **local-only (`useWishlistStore`), no backend calls**. Client page, mounted-gated (both the list and the empty-vs-list decision render only after a `mounted` flag — persisted store, see hydration guard below). Rows: 80px image (`resolveMinioUrl`, placeholder box when no `imageUrl`), brand/name/price, red "Add to bag" (shared `addProductToBag` helper — single-vs-multi-variant rule, see "Smart add-to-bag" below; maps `WishlistItem` → minimal `Product` with `slug: ''`), underlined "Remove". Empty state: circled heart + "Nothing saved yet" + "Start shopping" → `/products`. |

`/products` accepts either `?q=<term>` (unfiltered full-text search, unchanged — E2E depends on this contract) or `?category=<slug>` (category filter). On `?category`, the page fetches the category tree (`GET /product/categories`, via a module-level memoized `getTree()` in `page.tsx` — fetched once per page load rather than on every effect re-run; a failed fetch clears the cache so retries re-fetch) and resolves the slug via `findActiveCategoryBySlug` (`src/lib/api/categories.ts`) — a recursive, active-only match (inactive categories and their descendants never match, even if a descendant is itself active). A resolved match fetches `GET /product/categories/{categoryId}/products` (`fetchProductsByCategory` in `src/lib/api/products.ts`); an unknown or inactive slug silently falls back to the unfiltered `fetchProducts` path (no error surfaced). The heading and product data are resolved together and committed to state atomically (`if (!cancelled) { setHeading(...); setData(...) }`) so fast category-to-category navigation never shows a new heading beside the previous category's products. The category tree endpoint returns inactive root categories too (`active:false`, not filtered server-side) — the frontend resolver is what enforces active-only.

**Listing filter model (`src/lib/listing-filters.ts`, spec decision — not a bug):** Brand/Max-price/Sort are applied **client-side over the currently loaded results page** — there is no backend facet/sort/price API; server-side pagination is unaffected (changing filters never refetches). `deriveBrandFacets(products)` computes per-brand counts (sorted count desc, then name; `brand === undefined` excluded) from `data.products` on every render — facets always reflect the loaded page, not a global catalog. `applyFilters`/`sortProducts` (`'featured' | 'price-asc' | 'price-desc' | 'name'`, missing `lowestPrice` sorts last) are pure and re-derived inline in `ProductsContent` (no extra effect). `priceCeiling` is the loaded page's max `lowestPrice` rounded up to the next $100 (falls back to 100 with no priced products). Brand/max-price filters reset to empty whenever the query context changes (`status`/`search`/`page`/`categorySlug` — same effect, same eslint-disable block as the existing loading/error reset); `sort` is a presentation preference and is deliberately **not** reset. Desktop (`lg:`) renders `FilterSidebar` (`src/components/listing/filter-sidebar.tsx`); below `lg:` there is no brand/price UI — `CategoryChipRail` (`src/components/listing/category-chip-rail.tsx`) replaces it with All + the four category chips, active chip = current `?category=` slug (or All when absent). `ListingToolbar` (`src/components/listing/listing-toolbar.tsx`) shows `{shown.length} products` (the **filtered** count, not `data.total`) and the sort `<select>` — the count and the word "products" must stay inside one element's text (`text=/\d+ products/` — TC-E2E-003 depends on this). Cards get a decorative star row as `children` (same `decorativeRating`/`starString`/`formatReviews` helpers `best-sellers.tsx` uses). A distinct **filter empty state** ("No matches" + "Clear filters") renders only when the loaded page had products but the active filters filtered all of them out (`data.products.length > 0 && shown.length === 0`); a genuine zero-result page (e.g. a `?q=` miss) keeps the original "No products found." message. `src/components/product/product-grid.tsx` was deleted (Products page was its only consumer) — the card grid now renders inline.
| `(checkout)/cart/` | `/cart` |
| `(checkout)/checkout/` | `/checkout` |
| `(account)/account/` | `/account`, `/account/orders/[id]` — middleware-guarded |
| `login/` | `/login` |
| `register/` | `/register` |
| `order-confirmation/` | `/order-confirmation` |

## API Routes (`src/app/api/`)

### Auth proxies (`/api/auth/*`)
- `POST /api/auth/login` — rate-limited (5/min); proxies to Spring `/auth/login`; strips `refreshToken` from response body, sets httpOnly `walmal-rt` cookie (`path=/api/auth`, 7-day) + `walmal-auth` presence cookie server-side (avoids Chromium IPC race — see `gotchas.md`); returns `{ accessToken, ... }` to client.
- `POST /api/auth/register` — rate-limited (3/min); same cookie pattern as login.
- `POST /api/auth/refresh` — rate-limited (20/min); reads `walmal-rt` cookie, calls Spring `/auth/refresh`, rotates cookie, returns new `accessToken`.
- `POST /api/auth/logout` — **local only. Does NOT proxy to Spring.** The whole route expires the `walmal-rt` cookie (`maxAge: 0`) and returns 200; unlike the three routes above, it makes no upstream call. **The refresh token therefore stays valid server-side until its own TTL expires** — logout drops the browser's copy, it does not revoke. Anything relying on server-side revocation at logout (session invalidation, "sign out everywhere", post-incident lockout) is **not implemented**. Do not read this line as a security control; it is a client-side cookie clear.
- Full auth contract (token TTL, roles, storage strategy): see `../walmal/docs/kb/SYSTEM.md`.

### Other routes
- `POST /api/payment-intent` — rate-limited (10/min); calls Stripe SDK server-side; requires `STRIPE_SECRET_KEY`; returns `{ clientSecret }` or `{ error }`.
- `GET /api/minio/[...path]` — reverse-proxies MinIO object storage; keeps MinIO URL server-side.
- `src/app/api/v1/*` (orders, cart, inventory, product) — **inactive/legacy mock routes; not used by tests or the real app; deletion is routine cleanup that updates this file.**

## Zustand Stores (`src/store/`)

- `auth-store.ts` — `useAuthStore`; state: `{ token, user, status }`; actions: `login`, `register`, `refresh`, `logout`, `setToken`; no persistence (access token in memory only); sets `walmal-auth` presence cookie client-side as fallback.
- `cart-store.ts` — `useCartStore`; persisted via `zustand/middleware` persist, key **`walmal-cart`** (localStorage); action `mergeGuestCart` called on silent-refresh to merge local guest items with server cart.
- `wishlist-store.ts` — `useWishlistStore`; **local-only, no backend** — persisted via `zustand/middleware` persist, key **`walmal-wishlist`** (localStorage); state: `{ items: WishlistItem[] }`; actions: `toggle` (add/remove by `productId`), `remove`, `has`. Mirrors `cart-store.ts`'s pattern.

## Global Chrome (`src/components/layout/`)

**Lifted cart-drawer state**: `(shop)/layout.tsx` is a client component owning `cartOpen` and rendering the **single shared `CartDrawer` instance** for the shop chrome. It passes `onOpenCart` to both `SiteHeader` (desktop Bag button) and `BottomTabBar` (mobile Bag tab). `SiteHeader`'s `onOpenCart` prop is **optional**: when provided the header renders **no** drawer of its own; when absent (other layout groups) it falls back to its original self-contained behavior (private `cartOpen` + its own `CartDrawer`). The layout wrapper adds `pb-[62px] lg:pb-0` so content isn't hidden behind the fixed tab bar.

`SiteHeader` (client) renders, in order: `AnnouncementBar` (server component; red `bg-primary` strip, `label-caps`, "Free local delivery over $80 · Worldwide shipping available") as a non-sticky sibling above the sticky `<header>` (`bg-background/90 backdrop-blur border-b border-border`, inner `max-w-[1360px]`), then `CartDrawer` (standalone mode only, see above) and `MobileMenu` as siblings below.

- **Logo**: `WALMAL<span class=text-primary>SPORT</span>` in `display-heading` (Anton), links to `/`.
- **Nav links source of truth**: `nav-links.ts` exports the single `NAV_LINKS` array (`{label, href, mobileOnly?}`) consumed by both `SiteHeader` and `MobileMenu` — edit it once, not per-component. `SiteHeader` filters out `mobileOnly` entries (currently just Saved) for the desktop nav; `MobileMenu` renders the full array.
- **Desktop nav** (`hidden lg:flex`): Shop All → `/products`, then Jerseys/Boots/Teamwear/Equipment → `/products?category=<slug>` — `label-caps` links, red bottom border on hover.
- **Search**: plain GET form — `<form action="/products">` with `<input name="q">` (contract: submits to `/products?q=<query>`; E2E depends on the `q` param name). A visually-hidden `<button type="submit">` is included for keyboard/screen-reader submission. Desktop form in the lg row; a mobile search row renders below the bar **only** on `/` and `/products` (via `usePathname()`).
- **Wishlist heart**: links to `/saved`; count from `useWishlistStore((s) => s.items.length)` (length-selector, not the array — avoids re-rendering `SiteHeader` on item content changes); red/filled when count > 0, muted otherwise.
- **Auth area** (E2E contract — texts/hrefs must not change): guest → "Sign in" (`/login`) + "Register" (`/register`); authenticated → "Hi, {username}" (`/account`) + "Sign out" button calling `logout`. Implemented once as the shared `AuthLinks` client component (`auth-links.tsx`, `variant: 'header' | 'menu'` for styling, `onNavigate?` for menu-close) — used by both `SiteHeader` (`variant="header"`) and `MobileMenu` (`variant="menu"`). Restyle via the variant's class constants freely; never rename the texts/hrefs.
- **Bag button** (`cart-icon-button.tsx`): red `bg-primary` button labeled "Bag" with white count pill; keeps `aria-label="Cart (N items)"`; with `onClick` prop it opens `CartDrawer` (the header's `onOpenCart` when lifted, else the header's private `cartOpen`), without it it links to `/cart`.
- **Mobile row** (`lg:hidden`): hamburger (`aria-label="Menu"`, `aria-haspopup="dialog"`, `aria-expanded={menuOpen}`) opens `MobileMenu` — a shadcn `Sheet side="left"` dark panel with Anton nav links from the shared `NAV_LINKS` (Shop All, category links, Saved → `/saved`), a visually-hidden `SheetDescription` ("Site navigation") for a11y, the shared `AuthLinks` (`variant="menu"`), and "Help & returns" (`href="#"`). Every item closes the sheet on click.
- **Bottom tab bar** (`bottom-tab-bar.tsx`, mobile only `lg:hidden`): `fixed bottom-0 inset-x-0 z-40` 4-col grid (`bg-[rgba(12,12,14,.96)]` + blur + top border), lucide icons 19px + `label-caps` 9.5px labels. Tabs: Home `/`, Shop `/products`, Saved `/saved` (red badge = wishlist count), Bag (a `<button>` calling `onOpenCart`; red badge = cart quantity sum via `useCart().itemCount` — same count as the header pill). Active tab via `usePathname()` (exact match for `/`, `startsWith` otherwise): white full-opacity label; inactive `#8a8a90` at `.62` opacity. Counts are mounted-gated.
- **Hydration guard**: cart/wishlist counts come from persisted (localStorage) Zustand stores — components render count 0 until the shared `useMounted()` hook (`src/hooks/use-mounted.ts`, `useSyncExternalStore` with a server snapshot of `false` — no setState-in-effect) returns true, so server HTML matches the first client render. Apply this hook to any UI derived from a persisted store.
- **Footer** (`site-footer.tsx`, server component): at `md:` and up, a 4-column grid (`1.5fr 1fr 1fr 1.2fr`) inside a `max-w-[1360px]` wrapper. Brand column: `WALMALSPORT` logo, blurb, and the `NewsletterForm` client component. Shop column: derived from the shared `NAV_LINKS` (minus the "Shop All" catch-all) plus a footer-only "Sale" entry pointing at unfiltered `/products`. Help column: Track order → `/account`, Returns/Size guide/Contact us → `#` (no pages yet). Stores column: static text (not links) — no store-locator page exists. Bottom bar (md+ only): `© 2026 Walmal Sport. All rights reserved.` (static text, not `new Date().getFullYear()`) + Instagram/Facebook/TikTok → `#` (no lucide brand icons available; plain text links). Below `md:` the footer is a **minimal centered block per the mobile wireframe** — logo (19px), socials row, © (11.5px `#4b4b52`) only; the link columns, newsletter, and desktop bottom bar are `hidden` on mobile (still in the HTML, hidden via CSS).
  - **Newsletter signup is decorative — no backend.** `newsletter-form.tsx` (client) `preventDefault`s the submit, calls `toast.success(...)` from `sonner`, and clears the input; there is no subscription endpoint or persisted email anywhere. This is a spec decision for the Walmal Sport reskin, not an oversight — do not treat the missing endpoint as a bug.

## Homepage (`src/app/(shop)/page.tsx` + `src/components/home/`)

Server page, `fetchProductsSSG` + ISR `revalidate = 3600`, try/catch so a down backend at build time renders the static sections with empty product rails. **The search DTO exposes no `createdAt` — response order stands in for recency**: `arrivals = products.slice(0, 6)` feeds the New Arrivals rail, `best = products.slice(6, 14)` feeds Best Sellers. Section order: `Hero` → `CategoryTiles` → `ProductRail("New Arrivals")` → `PromoBanner` → `BestSellers` → `TrustBar`.

- `hero.tsx`, `promo-banner.tsx`, `trust-bar.tsx`, `category-tiles.tsx` — server components; static art from `/public/sport/*.svg` (plain `<img>`, CSP-safe, gradient overlays per wireframe). **`category-tiles.tsx` hardcodes the four category slugs (`jerseys`/`boots`/`teamwear`/`equipment`) — coupled to the V17 seeded taxonomy** (`../walmal` V17 migration); desktop 4-up image tiles, mobile horizontal chip rail (with an "All" chip → unfiltered `/products`).
- `product-rail.tsx` — client; heading + "View all →" + scroll-snap horizontal rail of `ProductCard` (200px mobile / 270px desktop), `badge="New"`. Renders `null` for an empty list.
- `best-sellers.tsx` — client; 2-col mobile / 4-col desktop grid of `ProductCard` with a decorative star row; badges from a **static map keyed by product name** (`'Harbour City FC 26/27 Home Jersey': 'Best seller'`, `'National Team Authentic Home Jersey': 'Authentic'`, `'Lite Carbon Shinguards': '-15%'`) — a renamed product silently loses its badge.
- **Decorative ratings are seed data, no backend reviews exist** (spec decision): `src/lib/decorative-ratings.ts` FNV-1a-hashes the product id → `{ stars: 4|4.5|5, reviews: 120–3400 }`, deterministic so SSG and CSR render identically; `starString()`/`formatReviews()` (`1.4k` above 1000) format for display.

## Product Card + Smart Add-to-Bag

`product-card.tsx` (client): white tile on the dark theme (`bg-white rounded-[14px]`, image on `#f1f1ee`, Anton price, dark "Add" button that hovers red). Keeps `data-testid="product-card"` / `product-card-link"` — E2E contract. Optional `badge` prop ("New" renders red, anything else near-black) and `children` slot (Best Sellers' star row).

**Smart add-to-bag rule** (`src/lib/add-to-bag.ts`, `addProductToBag(product)`): fetches the product's variants; exactly one ACTIVE variant **and** a non-null `lowestPrice` → adds it to the cart store directly + `toast.success`, returns `'added'`; otherwise returns `'navigate'` and the caller routes to the product detail page (variant selector lives there). CartItem fields mirror `product-detail.tsx` exactly — **raw `primaryImageUrl`** (the cart drawer resolves MinIO URLs at render), `variantName` = `[name, color, size].join(' · ') || sku`. Used by `ProductCard`'s Add button and the Saved page's "Add to bag".

**Heart toggle** (`src/components/product/wishlist-heart.tsx`): shared client component on every `ProductCard` (top-right of the image, 32px white circle) and on the product detail page (44px, beside Add to cart). Toggles `useWishlistStore` with the `Product → WishlistItem` mapping (raw `primaryImageUrl`, resolved at render); saved state is `useMounted()`-gated; `aria-pressed` + `Save {name}` / `Remove {name} from saved` labels. No toast on toggle — feedback is the heart fill + count badges (spec decision).

## Toasts

`sonner` provides the app-wide toast system. `<Toaster position="bottom-right" theme="dark" />` is rendered in `Providers` (`src/components/providers.tsx`), a sibling of `{children}` inside `AuthProvider`, so `toast(...)` from `sonner` can be called anywhere in the tree.

## Middleware (`src/middleware.ts`)

Matches `/account/:path*`. Redirects to `/login?next=…` if `walmal-auth` presence cookie is absent. UX guard only — backend JWT validation is the real enforcement.

## Stripe CardElement Flow

1. `checkout-form.tsx` calls `POST /api/payment-intent` to get `clientSecret`.
2. Wraps UI in `<Elements stripe={stripePromise}>` (no `clientSecret` on Elements — uses CardElement, not Payment Element).
3. On submit: `stripe.confirmCardPayment(clientSecret, { payment_method: { card } })`.
4. On success: calls Spring to create order, then navigates to `/order-confirmation`.

## Rate Limiter (`src/lib/rate-limit.ts`)

In-memory fixed-window, single-process (not shared across instances). Limits per 60-second window:

| Config export | Env var | Default |
|---------------|---------|---------|
| `PAYMENT_INTENT_LIMIT` | `RATE_LIMIT_PAYMENT_INTENT` | 10 |
| `LOGIN_LIMIT` | `RATE_LIMIT_LOGIN` | 5 |
| `REGISTER_LIMIT` | `RATE_LIMIT_REGISTER` | 3 |
| `REFRESH_LIMIT` | `RATE_LIMIT_REFRESH` | 20 |

Key = `{action}:{clientIp}` (x-forwarded-for → x-real-ip → `'unknown'`). Node runtime only; not edge-compatible.
