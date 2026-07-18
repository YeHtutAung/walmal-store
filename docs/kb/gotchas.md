# walmal-store — Gotchas

## Admin-E2E Residue Products Are Invisible Here (since 2026-07-18)

The walmal-admin E2E suite leaves deactivated `E2E Product <timestamp>` rows in the shared test DB. The storefront's catalog fetchers all pass `status=ACTIVE`, so those rows can never appear in the homepage rails, `/products`, or category listings — store E2E runs and screenshots need **no** SQL cleanup. The cleanup recipe (delete residue products + children) only matters for admin-side visuals (its product table, terminals list).

## Base64url JWT Decode (`src/store/auth-store.ts`)

Spring JWTs use base64url encoding (`-` and `_`, no padding). `decodePayload()` must convert before `atob()`:

```ts
const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=')
return JSON.parse(atob(padded))
```

Do not simplify this — plain `atob(token.split('.')[1])` throws for most real tokens.

## Presence Cookie Chromium IPC Race (`src/app/api/auth/login/route.ts`)

The login proxy route sets `walmal-auth=1` server-side (in addition to client-side `setAuthCookie()`). This is intentional: Chromium's multi-process cookie store may not commit a cookie written by the client JS before the next RSC fetch (navigation) reads it, causing the middleware to redirect authenticated users to `/login`. The server-set cookie commits before the response is delivered. Do not remove the server-side set.

## Silent-Refresh 429 → Guest Downgrade

If `POST /api/auth/refresh` returns 429 (rate-limited), `auth-store.refresh()` catches the error and sets `status: 'guest'`. This is recoverable — reloading the page triggers a fresh silent refresh. No user action besides reload is needed. Occurs only if refresh is called more than 20 times per minute per IP (unusual in normal use).

## Stale `.next/types` TSC Errors After Route Deletions

Deleting a route file leaves stale generated types in `.next/types/`. These cause TypeScript errors on `tsc --noEmit` until `rm -rf .next` and a fresh `next build` or `next dev` run. The errors reference non-existent route files and are not real type bugs.

## Reused `:3000` Dev Server Has Placeholder Stripe Keys

`.env.local` carries placeholder `pk_test_` / `sk_test_` values (not real keys). If Playwright reuses a running dev server on port 3000, `POST /api/payment-intent` returns 500 (Stripe SDK rejects the placeholder key). Playwright is configured with `reuseExistingServer: false` on port 3001 specifically to avoid this — the fresh subprocess gets real keys from `.env.test.local` via the `env:` block. Do not change `reuseExistingServer` to `true` for the frontend webServer without understanding this.

## HMR Auth Store Re-evaluation (`src/store/auth-store.ts`)

Next.js dev-mode HMR can re-evaluate the auth-store module mid-navigation, producing a second `create()` call and a fresh store instance with `status: 'idle'`. The `globalThis.__walmal_auth_store` singleton guard preserves the existing instance across hot-update cycles. Do not refactor this to a simple module-level `create()` call.

---

> Environment notes (machine-specific): Docker WSL layout, Cygwin shell caveats, and bash `!` rewriting are documented in agent memory, not here.
