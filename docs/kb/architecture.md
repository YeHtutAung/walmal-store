# walmal-store — Architecture

> Cross-repo facts (ports, auth contract, env vars, error bodies): `../walmal/docs/kb/SYSTEM.md`.

## Page Routes (`src/app/`)

| Route group / path | URL(s) |
|--------------------|--------|
| `(shop)/page.tsx` | `/` (home) |
| `(shop)/products/` | `/products`, `/products/[slug]` |
| `(shop)/saved/` | `/saved` — wishlist page; **local-only (`useWishlistStore`), no backend calls**. Client page, mounted-gated (both the list and the empty-vs-list decision render only after a `mounted` flag — persisted store, see hydration guard below). Rows: 80px image (`resolveMinioUrl`, placeholder box when no `imageUrl`), brand/name/price, red "Add to bag" (currently `router.push` to `/products/{productId}` — TODO(B7): shared `addProductToBag` helper), underlined "Remove". Empty state: circled heart + "Nothing saved yet" + "Start shopping" → `/products`. |

`/products` accepts either `?q=<term>` (unfiltered full-text search, unchanged — E2E depends on this contract) or `?category=<slug>` (category filter). On `?category`, the page fetches the category tree (`GET /product/categories`, via a module-level memoized `getTree()` in `page.tsx` — fetched once per page load rather than on every effect re-run; a failed fetch clears the cache so retries re-fetch) and resolves the slug via `findActiveCategoryBySlug` (`src/lib/api/categories.ts`) — a recursive, active-only match (inactive categories and their descendants never match, even if a descendant is itself active). A resolved match fetches `GET /product/categories/{categoryId}/products` (`fetchProductsByCategory` in `src/lib/api/products.ts`); an unknown or inactive slug silently falls back to the unfiltered `fetchProducts` path (no error surfaced). The heading and product data are resolved together and committed to state atomically (`if (!cancelled) { setHeading(...); setData(...) }`) so fast category-to-category navigation never shows a new heading beside the previous category's products. The category tree endpoint returns inactive root categories too (`active:false`, not filtered server-side) — the frontend resolver is what enforces active-only.
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
- **Hydration guard**: cart/wishlist counts come from persisted (localStorage) Zustand stores — components render count 0 until a `mounted` flag flips in `useEffect`, so server HTML matches the first client render. Apply this pattern to any UI derived from a persisted store.
- **Footer** (`site-footer.tsx`, server component): 4-column grid (`1.5fr 1fr 1fr 1.2fr`, collapsing to a single centered column below `md:`) inside a `max-w-[1360px]` wrapper. Brand column: `WALMALSPORT` logo, blurb, and the `NewsletterForm` client component. Shop column: derived from the shared `NAV_LINKS` (minus the "Shop All" catch-all) plus a footer-only "Sale" entry pointing at unfiltered `/products`. Help column: Track order → `/account`, Returns/Size guide/Contact us → `#` (no pages yet). Stores column: static text (not links) — no store-locator page exists. Bottom bar: `© 2026 Walmal Sport. All rights reserved.` (static text, not `new Date().getFullYear()`) + Instagram/Facebook/TikTok → `#` (no lucide brand icons available; plain text links).
  - **Newsletter signup is decorative — no backend.** `newsletter-form.tsx` (client) `preventDefault`s the submit, calls `toast.success(...)` from `sonner`, and clears the input; there is no subscription endpoint or persisted email anywhere. This is a spec decision for the Walmal Sport reskin, not an oversight — do not treat the missing endpoint as a bug.

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
