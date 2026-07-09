# Rate Limiting for payment-intent and Auth Routes — Design

**Date:** 2026-07-10
**Status:** Approved
**Closes:** security checklist items API-03 (rate limiting) and the SENS-06 mitigation
(payment-intent is intentionally unauthenticated for guest checkout; rate limiting is
the agreed compensating control).

## Problem

Four Next.js API routes accept unauthenticated POSTs with no rate limiting:

- `/api/payment-intent` — creates a Stripe PaymentIntent per call; abuse wastes Stripe
  API quota and can flag the account
- `/api/auth/login` — brute-forceable
- `/api/auth/register` — mass account creation
- `/api/auth/refresh` — cheap amplification against the backend

`/api/auth/logout` is cheap and idempotent — not rate limited (YAGNI).

## Constraints

- Deployment target is a **single Node.js instance** — in-memory counters are correct
  and require zero new dependencies. (Multi-instance/serverless would need a shared
  store; out of scope.)
- The 96-test Playwright suite hits these routes from `127.0.0.1`, so production
  defaults would break it. Limits must be env-overridable, mirroring the Spring
  backend's test-profile pattern (100k limits in `application-test.yml`).

## Design

### Limiter module: `src/lib/rate-limit.ts` (new, node runtime only)

- `checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; retryAfter: number }`
  - `RateLimitConfig = { limit: number; windowMs: number }`
  - Fixed-window counter in a module-level `Map<string, { count: number; resetAt: number }>`
  - First request in a window sets `resetAt = now + windowMs`, `count = 1`; subsequent
    requests increment; `count > limit` → `allowed: false`,
    `retryAfter` = seconds until `resetAt` (ceiling, min 1). Example: `limit: 10`
    allows requests 1–10; request 11 is the first rejection.
  - When `allowed` is `true`, `retryAfter` is `0`
  - Never throws
- Key format: `"<route>:<ip>"` — routes never share buckets
- Lazy cleanup: when the map size exceeds 10,000 entries, sweep expired entries during
  the current call. No timers (nothing to leak, no serverless lifecycle issues).
- `getClientIp(req: NextRequest): string` — first entry of `x-forwarded-for` (trimmed),
  else `x-real-ip`, else `'unknown'`. Direct-connection clients (local dev) share the
  `'unknown'` bucket; acceptable for a single instance behind a proxy in production.
- Exported per-route configs are `RateLimitConfig` objects with
  `windowMs: 60_000` baked in for all routes. The `limit` field is parsed once at
  module load from env, falling back to the default on missing/malformed values
  (`Number.isFinite` and `> 0` check):

| Config export (`RateLimitConfig`) | `limit` env var | Default limit (per 60s) |
|---|---|---|
| `PAYMENT_INTENT_LIMIT` | `RATE_LIMIT_PAYMENT_INTENT` | 10 |
| `LOGIN_LIMIT` | `RATE_LIMIT_LOGIN` | 5 |
| `REGISTER_LIMIT` | `RATE_LIMIT_REGISTER` | 3 |
| `REFRESH_LIMIT` | `RATE_LIMIT_REFRESH` | 20 |

### Route integration (4 files modified)

The four route handlers already use the default Node.js runtime (no
`export const runtime` present). The `Map`-based limiter relies on this — do not
switch any of these routes to the edge runtime.

At the top of each `POST` handler, before any body parsing or upstream call:

```ts
const rl = checkRateLimit(`payment-intent:${getClientIp(req)}`, PAYMENT_INTENT_LIMIT)
if (!rl.allowed) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
  )
}
```

(Route prefix and config vary per file: `login`/`LOGIN_LIMIT`, etc.)

Response-body convention (correction found in code review): the three auth proxy
routes' locally generated errors use `{ code, message }` (e.g. `NO_COOKIE`,
`UPSTREAM_UNAVAILABLE`), and the client (`src/lib/api/auth.ts`) reads
`data?.code` / `data?.message`. Their 429 body is therefore
`{ code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' }`.
Only `payment-intent` uses `{ error: ... }`, matching its existing 400/500 shape.

### Test environment

`.env.test.local` adds:

```
RATE_LIMIT_PAYMENT_INTENT=100000
RATE_LIMIT_LOGIN=100000
RATE_LIMIT_REGISTER=100000
RATE_LIMIT_REFRESH=100000
```

### Error handling

- Limiter never throws; env parsing failures silently fall back to defaults.
- 429 responses are plain JSON per each route's convention (`{ error }` on
  payment-intent, `{ code, message }` on the auth proxies — see Route
  integration above); the existing client error paths surface the message
  unchanged.
- Counters reset on server restart (accepted for in-memory design).

## Testing

TDD; unit tests in `tests/lib/rate-limit.test.ts` (vitest):

1. Requests up to the limit are allowed; the next is rejected with `retryAfter >= 1`
2. After the window elapses (fake timers), the counter resets and requests are allowed
3. Keys are isolated: exhausting `login:1.2.3.4` does not affect `login:5.6.7.8`
   or `register:1.2.3.4`
4. `getClientIp`: `x-forwarded-for` multi-entry → first, `x-real-ip` fallback,
   neither → `'unknown'`
5. Malformed env override falls back to default (tested via config parser helper)

Verification:

- Full Playwright suite (96 tests) stays green — proves the `.env.test.local`
  overrides work
- Manual: 11 rapid `curl` POSTs to `/api/payment-intent` on a dev server (production
  defaults) → 11th returns 429 with `Retry-After`
- Update `tests/security/FRONTEND_CHECKLIST.md`: API-03 → PASS for these routes,
  SENS-06 → mitigated

## Out of scope (YAGNI)

- Shared-store limiter (Upstash/Redis) for multi-instance deployment
- Rate limiting `logout` or read-only product/inventory proxy routes
- Sliding-window or token-bucket algorithms
- `X-RateLimit-*` response headers beyond `Retry-After`
