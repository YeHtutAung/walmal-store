# walmal-store — Architecture

> Cross-repo facts (ports, auth contract, env vars, error bodies): `walmal/docs/kb/SYSTEM.md`.

## Page Routes (`src/app/`)

| Route group / path | URL(s) |
|--------------------|--------|
| `(shop)/page.tsx` | `/` (home) |
| `(shop)/products/` | `/products`, `/products/[slug]` |
| `(checkout)/cart/` | `/cart` |
| `(checkout)/checkout/` | `/checkout` |
| `(account)/account/` | `/account`, `/account/orders` — middleware-guarded |
| `login/` | `/login` |
| `register/` | `/register` |
| `order-confirmation/` | `/order-confirmation` |

## API Routes (`src/app/api/`)

### Auth proxies (`/api/auth/*`)
- `POST /api/auth/login` — rate-limited (5/min); proxies to Spring `/auth/login`; strips `refreshToken` from response body, sets httpOnly `walmal-rt` cookie (`path=/api/auth`, 7-day) + `walmal-auth` presence cookie server-side (avoids Chromium IPC race — see `gotchas.md`); returns `{ accessToken, ... }` to client.
- `POST /api/auth/register` — rate-limited (3/min); same cookie pattern as login.
- `POST /api/auth/refresh` — rate-limited (20/min); reads `walmal-rt` cookie, calls Spring `/auth/refresh`, rotates cookie, returns new `accessToken`.
- `POST /api/auth/logout` — clears `walmal-rt` cookie; proxies to Spring `/auth/logout`.
- Full auth contract (token TTL, roles, storage strategy): see `walmal/docs/kb/SYSTEM.md`.

### Other routes
- `POST /api/payment-intent` — rate-limited (10/min); calls Stripe SDK server-side; requires `STRIPE_SECRET_KEY`; returns `{ clientSecret }` or `{ error }`.
- `GET /api/minio/[...path]` — reverse-proxies MinIO object storage; keeps MinIO URL server-side.
- `src/app/api/v1/*` (orders, cart, inventory, product) — **inactive/legacy mock routes; not used by tests or the real app; deletion is routine cleanup that updates this file.**

## Zustand Stores (`src/store/`)

- `auth-store.ts` — `useAuthStore`; state: `{ token, user, status }`; actions: `login`, `register`, `refresh`, `logout`, `setToken`; no persistence (access token in memory only); sets `walmal-auth` presence cookie client-side as fallback.
- `cart-store.ts` — `useCartStore`; persisted via `zustand/middleware` persist, key **`walmal-cart`** (localStorage); action `mergeGuestCart` called on silent-refresh to merge local guest items with server cart.

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
