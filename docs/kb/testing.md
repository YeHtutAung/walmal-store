# walmal-store — Testing

## Unit Tests (Vitest)

- Config: `vitest.config.ts` — jsdom environment, globals enabled, `@` alias → `./src`.
- Setup file: `tests/setup.ts`.
- Test discovery: no explicit `include` — Vitest default pattern, with `tests/e2e/**` excluded.
- 15 test files covering: `auth-store`, `cart-store`, `wishlist-store`, `rate-limit`, `api/client`, `api/auth`, `api/orders`, `api/products`, `api/payment-intent/route`, `account/layout`, `cart/cart-drawer`, `checkout/checkout-form`, `product/wishlist-heart`, `lib/categories` (slug resolver), `lib/decorative-ratings`.
- Run command: `npx vitest run`

## E2E Tests (Playwright)

- Config: `playwright.config.ts`; test dir: `tests/e2e/`; global setup: `tests/e2e/global-setup.ts`.
- Browsers: chromium, firefox, webkit (sequential, 1 worker, no retries).
- Expected: **105 tests pass** (35 unique × 3 browsers).
- Run command: `npx playwright test`

### Two-WebServer Setup

**Backend** (`reuseExistingServer: true`):
- Starts Docker services (postgres, redis, rabbitmq, minio, mailhog) then Spring JAR with `-Dspring.profiles.active=test`.
- JAR: `../walmal/walmal-app/target/walmal-app-0.1.0-SNAPSHOT.jar`; health URL: `http://localhost:8080/actuator/info`; startup timeout: 180s.
- The test profile lifts rate limits and adds the E2E origin to CORS — values live in `../walmal/docs/kb/SYSTEM.md` (Test profile).
- Rebuild after backend config changes: `cd ../walmal && ./mvnw -pl walmal-app -am -DskipTests clean package`

**Frontend** (`reuseExistingServer: false`):
- Always starts a fresh Next.js process on port **3001** (`npm run dev -- --port 3001`).
- `reuseExistingServer: false` is intentional: a running dev server on `:3000` has placeholder Stripe keys from `.env.local`; a fresh process gets real test keys injected via the `env:` block in playwright.config.ts.

### `.env.test.local`

- Not committed (gitignored). Required: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (real `pk_test_…`), `STRIPE_SECRET_KEY` (real `sk_test_…`).
- Playwright loads this file at startup via `dotenv`; the `env:` block in `webServer[1]` forwards the three vars to the Next.js subprocess.

### `global-setup.ts` Drift Checks

Runs before any test and fails fast on:
1. `STRIPE_SECRET_KEY` not starting with `sk_test_` (prevents 500s on payment-intent).
2. `GET /actuator/info` → `info.walmal.profile !== 'test'` (catches reused non-test backend with production rate limits).

Also resets inventory stock for seeded test variants to 500 units (3 browsers × 3 checkout tests = 9 units consumed per run; seeded default is 3).

### Stripe CardElement Technique

- Iframe selector: `iframe[name^="__privateStripeFrame"]` — use `.first()`.
- Fill: click `[placeholder="Card number"]`, then `page.keyboard.type(number + expiry + cvc)` — Stripe auto-advances between fields; no Tab needed.
- Test cards: `4242424242424242` (success), `4000000000009995` (declined/insufficient_funds).

### Test Credentials

Defined in `../walmal/walmal-app/src/main/resources/db/migration/V12__auth_add_test_accounts.sql` (source of truth). See `../walmal/docs/kb/SYSTEM.md` for pointer.
