# walmal-store — Architecture

> Cross-repo facts (ports, auth contract, env vars, error bodies): `../walmal/docs/kb/SYSTEM.md`.

## Page Routes (`src/app/`)

| Route group / path | URL(s) |
|--------------------|--------|
| `(shop)/page.tsx` | `/` (home) |
| `(shop)/products/` | `/products`, `/products/[slug]` |

`/products` accepts either `?q=<term>` (unfiltered full-text search, unchanged — E2E depends on this contract) or `?category=<slug>` (category filter). On `?category`, the page fetches the category tree (`GET /product/categories`) and resolves the slug via `findActiveCategoryBySlug` (`src/lib/api/categories.ts`) — a recursive, active-only match (inactive categories and their descendants never match, even if a descendant is itself active). A resolved match fetches `GET /product/categories/{categoryId}/products` (`fetchProductsByCategory` in `src/lib/api/products.ts`) and renders the category name as the `<h1>`; an unknown or inactive slug silently falls back to the unfiltered `fetchProducts` path with the "Products" heading (no error surfaced). The category tree endpoint returns inactive root categories too (`active:false`, not filtered server-side) — the frontend resolver is what enforces active-only.
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
