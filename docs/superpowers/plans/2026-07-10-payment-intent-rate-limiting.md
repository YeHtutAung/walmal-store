# Payment-Intent & Auth Rate Limiting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In-memory, per-IP, fixed-window rate limiting on the four unauthenticated Next.js API routes (`/api/payment-intent`, `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`), closing security checklist items API-03 and the SENS-06 mitigation.

**Architecture:** A single new module `src/lib/rate-limit.ts` holds a module-level `Map` of fixed-window counters plus per-route `RateLimitConfig` exports (limits env-overridable, window fixed at 60s). Each of the four route handlers calls `checkRateLimit` at the top of `POST` and returns `429` + `Retry-After` when exceeded. `.env.test.local` sets all limits to 100000 so the 96-test Playwright suite (all traffic from 127.0.0.1) is unaffected.

**Tech Stack:** Next.js 16 App Router route handlers (node runtime), TypeScript, vitest (jsdom environment, `@` alias → `src`).

**Spec:** `docs/superpowers/specs/2026-07-10-payment-intent-rate-limiting-design.md`

**Repo:** `C:/YHA/006_Claude_Workspace/walmal-store` (branch `main`). Run all commands from the repo root.

**Important environment notes for the implementer:**
- This project's Next.js has breaking changes vs. your training data (see AGENTS.md). The route-handler API used here (NextRequest, `req.headers.get`, `NextResponse.json`) has been verified against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — the code below is correct as written.
- vitest runs in **jsdom**, where `NextRequest` cannot reliably be constructed. Tests for `getClientIp` use a minimal header-stub object instead (shown below). Do not try to `new NextRequest(...)` in tests.
- `.env.test.local` is gitignored (`.env*`). Its edit cannot be committed — that's expected.
- vitest fake timers mock `Date.now` by default; the window-expiry test relies on this.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/rate-limit.ts` (create) | Fixed-window limiter: `checkRateLimit`, `getClientIp`, `parseLimit`, per-route `RateLimitConfig` exports |
| `tests/lib/rate-limit.test.ts` (create) | Unit tests for the limiter module |
| `src/app/api/payment-intent/route.ts` (modify) | Add limiter check at top of `POST` |
| `src/app/api/auth/login/route.ts` (modify) | Add limiter check at top of `POST` |
| `src/app/api/auth/register/route.ts` (modify) | Add limiter check at top of `POST` |
| `src/app/api/auth/refresh/route.ts` (modify) | Add limiter check at top of `POST` |
| `.env.test.local` (modify, NOT committed) | 100000 limits for E2E |
| `tests/security/FRONTEND_CHECKLIST.md` (modify) | Mark API-03 PASS / SENS-06 mitigated |

---

### Task 1: Rate limiter module (`src/lib/rate-limit.ts`)

**Files:**
- Test: `tests/lib/rate-limit.test.ts`
- Create: `src/lib/rate-limit.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/rate-limit.test.ts` with exactly:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getClientIp, parseLimit } from '@/lib/rate-limit'

afterEach(() => {
  vi.useRealTimers()
})

// jsdom cannot construct a real NextRequest; a header-stub is all getClientIp reads.
function stubRequest(headers: Record<string, string>): NextRequest {
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  } as unknown as NextRequest
}

describe('checkRateLimit', () => {
  it('allows requests up to the limit, then rejects with retryAfter >= 1', () => {
    const config = { limit: 3, windowMs: 60_000 }
    for (let i = 1; i <= 3; i++) {
      expect(checkRateLimit('t-allow:1.1.1.1', config)).toEqual({ allowed: true, retryAfter: 0 })
    }
    const rejected = checkRateLimit('t-allow:1.1.1.1', config)
    expect(rejected.allowed).toBe(false)
    expect(rejected.retryAfter).toBeGreaterThanOrEqual(1)
    expect(rejected.retryAfter).toBeLessThanOrEqual(60)
  })

  it('resets the counter after the window elapses', () => {
    vi.useFakeTimers()
    const config = { limit: 1, windowMs: 60_000 }
    expect(checkRateLimit('t-window:1.1.1.1', config).allowed).toBe(true)
    expect(checkRateLimit('t-window:1.1.1.1', config).allowed).toBe(false)
    vi.advanceTimersByTime(60_001)
    expect(checkRateLimit('t-window:1.1.1.1', config).allowed).toBe(true)
  })

  it('isolates buckets per key (route and IP)', () => {
    const config = { limit: 1, windowMs: 60_000 }
    expect(checkRateLimit('t-iso-login:1.2.3.4', config).allowed).toBe(true)
    expect(checkRateLimit('t-iso-login:1.2.3.4', config).allowed).toBe(false)
    // different IP, same route: unaffected
    expect(checkRateLimit('t-iso-login:5.6.7.8', config).allowed).toBe(true)
    // same IP, different route: unaffected
    expect(checkRateLimit('t-iso-register:1.2.3.4', config).allowed).toBe(true)
  })
})

describe('getClientIp', () => {
  it('returns the first x-forwarded-for entry, trimmed', () => {
    expect(getClientIp(stubRequest({ 'x-forwarded-for': ' 9.9.9.9 , 10.0.0.1' }))).toBe('9.9.9.9')
  })

  it('falls back to x-real-ip', () => {
    expect(getClientIp(stubRequest({ 'x-real-ip': '8.8.8.8' }))).toBe('8.8.8.8')
  })

  it("returns 'unknown' when no forwarding headers are present", () => {
    expect(getClientIp(stubRequest({}))).toBe('unknown')
  })
})

describe('parseLimit', () => {
  it('parses valid positive numbers and falls back otherwise', () => {
    expect(parseLimit('25', 10)).toBe(25)
    expect(parseLimit(undefined, 10)).toBe(10)
    expect(parseLimit('abc', 10)).toBe(10)
    expect(parseLimit('-5', 10)).toBe(10)
    expect(parseLimit('0', 10)).toBe(10)
  })
})
```

Note: tests use distinct keys per test, so no reset hook is needed for the module-level Map.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/rate-limit.test.ts`
Expected: FAIL — cannot resolve `@/lib/rate-limit` (module does not exist).

- [ ] **Step 3: Write the implementation**

Create `src/lib/rate-limit.ts` with exactly:

```ts
import type { NextRequest } from 'next/server'

/**
 * In-memory fixed-window rate limiter for Next.js route handlers.
 *
 * Single-instance, node-runtime only: counters live in a module-level Map,
 * reset on server restart, and are NOT shared across instances. Do not use
 * from edge-runtime code. See
 * docs/superpowers/specs/2026-07-10-payment-intent-rate-limiting-design.md
 */

export interface RateLimitConfig {
  limit: number
  windowMs: number
}

interface Bucket {
  count: number
  resetAt: number
}

const WINDOW_MS = 60_000
const MAX_ENTRIES = 10_000

const buckets = new Map<string, Bucket>()

/** Parse a positive integer limit from an env value; fall back on anything else. */
export function parseLimit(envValue: string | undefined, fallback: number): number {
  const n = Number(envValue)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

// The configs below are parsed ONCE at module load. Changing process.env
// afterwards (e.g. in a test beforeEach) has no effect; tests pass explicit
// RateLimitConfig objects instead.

export const PAYMENT_INTENT_LIMIT: RateLimitConfig = {
  limit: parseLimit(process.env.RATE_LIMIT_PAYMENT_INTENT, 10),
  windowMs: WINDOW_MS,
}

export const LOGIN_LIMIT: RateLimitConfig = {
  limit: parseLimit(process.env.RATE_LIMIT_LOGIN, 5),
  windowMs: WINDOW_MS,
}

export const REGISTER_LIMIT: RateLimitConfig = {
  limit: parseLimit(process.env.RATE_LIMIT_REGISTER, 3),
  windowMs: WINDOW_MS,
}

export const REFRESH_LIMIT: RateLimitConfig = {
  limit: parseLimit(process.env.RATE_LIMIT_REFRESH, 20),
  windowMs: WINDOW_MS,
}

/**
 * Fixed-window check. `limit: 10` allows requests 1-10 in a window; request 11
 * is the first rejection. When allowed, retryAfter is 0; when rejected,
 * retryAfter is whole seconds until the window resets (min 1). Never throws.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfter: number } {
  const now = Date.now()

  // Lazy cleanup: only when the map grows large, sweep expired buckets.
  if (buckets.size > MAX_ENTRIES) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k)
    }
  }

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  bucket.count++
  if (bucket.count > config.limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  return { allowed: true, retryAfter: 0 }
}

/**
 * Client IP for rate-limit keying: first x-forwarded-for entry, else x-real-ip,
 * else 'unknown' (direct connections in dev share one bucket — acceptable for
 * a single instance behind a proxy in production).
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip') ?? 'unknown'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/rate-limit.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Run the full unit suite to check for regressions**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rate-limit.ts tests/lib/rate-limit.test.ts
git commit -m "feat(security): add in-memory fixed-window rate limiter module"
```

---

### Task 2: Wire the limiter into the four routes

**Files:**
- Modify: `src/app/api/payment-intent/route.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/app/api/auth/refresh/route.ts`
- Modify: `.env.test.local` (gitignored — edited but not committed)

There are no route-level unit tests in this project (route handlers are covered by the Playwright E2E suite), so this task is mechanical integration; verification happens in Task 3. All four routes follow the identical pattern: one import line, one guard block as the FIRST statements of `POST`, before any body/cookie parsing or upstream call.

- [ ] **Step 1: payment-intent**

In `src/app/api/payment-intent/route.ts`, add after the existing imports (line 2):

```ts
import { checkRateLimit, getClientIp, PAYMENT_INTENT_LIMIT } from '@/lib/rate-limit'
```

Then make the guard the first statements inside `export async function POST(req: NextRequest) {`, BEFORE `try {`:

```ts
  const rl = checkRateLimit(`payment-intent:${getClientIp(req)}`, PAYMENT_INTENT_LIMIT)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }
```

- [ ] **Step 2: login**

In `src/app/api/auth/login/route.ts`, add the import:

```ts
import { checkRateLimit, getClientIp, LOGIN_LIMIT } from '@/lib/rate-limit'
```

First statements of `POST`, before `const body = await req.json()`:

```ts
  const rl = checkRateLimit(`login:${getClientIp(req)}`, LOGIN_LIMIT)
  if (!rl.allowed) {
    return NextResponse.json(
      { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }
```

Note the body shape: the three auth proxy routes' locally generated errors use
`{ code, message }` (the client `src/lib/api/auth.ts` reads `data?.code` /
`data?.message`), so their 429 bodies are
`{ code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' }`.
Only `payment-intent` (Step 1) uses `{ error: ... }`, matching its existing
400/500 shape.

- [ ] **Step 3: register**

Same as Step 2 in `src/app/api/auth/register/route.ts`, with:

```ts
import { checkRateLimit, getClientIp, REGISTER_LIMIT } from '@/lib/rate-limit'
```

and key/config `` `register:${getClientIp(req)}` ``, `REGISTER_LIMIT` (429 body: `{ code: 'RATE_LIMITED', message: ... }` as in Step 2).

- [ ] **Step 4: refresh**

Same pattern in `src/app/api/auth/refresh/route.ts`, with:

```ts
import { checkRateLimit, getClientIp, REFRESH_LIMIT } from '@/lib/rate-limit'
```

and key/config `` `refresh:${getClientIp(req)}` ``, `REFRESH_LIMIT` (429 body: `{ code: 'RATE_LIMITED', message: ... }` as in Step 2) — the guard goes BEFORE `const refreshToken = req.cookies.get('walmal-rt')?.value`.

- [ ] **Step 5: E2E env overrides**

Append to `.env.test.local` (file exists; do NOT commit it — it is gitignored):

```
# Rate limits — effectively disabled for E2E (all traffic from 127.0.0.1)
RATE_LIMIT_PAYMENT_INTENT=100000
RATE_LIMIT_LOGIN=100000
RATE_LIMIT_REGISTER=100000
RATE_LIMIT_REFRESH=100000
```

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors (pre-existing warnings, if any, are acceptable).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/payment-intent/route.ts src/app/api/auth/login/route.ts src/app/api/auth/register/route.ts src/app/api/auth/refresh/route.ts
git commit -m "feat(security): rate limit payment-intent and auth routes (API-03, SENS-06 mitigation)"
```

Note: `git status` will still show nothing for `.env.test.local` (gitignored) — that is correct.

---

### Task 3: Live verification and checklist update

**Files:**
- Modify: `tests/security/FRONTEND_CHECKLIST.md`

- [ ] **Step 1: Manual 429 verification with production defaults**

Start the dev server (production default limits apply because `.env.development`/`.env.local` have no RATE_LIMIT vars):

```bash
npm run dev
```

Wait for "Ready", then in another shell send 11 rapid empty-body POSTs (the guard runs before body validation, so each returns 400 until the limit trips — Stripe is never called). Cygwin caveat: the `{}` body below is safe as-is, but if you ever change the body, note that `!` characters inside `-d '...'` get mangled by this shell — write such bodies to a file and use `--data-binary @file` instead:

```bash
for i in $(seq 1 11); do curl -s -o /dev/null -w "%{http_code} " -X POST http://localhost:3000/api/payment-intent -H "Content-Type: application/json" -d '{}'; done; echo
```

Expected output: `400 400 400 400 400 400 400 400 400 400 429`

Also verify the Retry-After header on the 12th request:

```bash
curl -s -i -X POST http://localhost:3000/api/payment-intent -H "Content-Type: application/json" -d '{}' | grep -i "retry-after\|HTTP"
```

Expected: `HTTP/1.1 429` and a `Retry-After: <1-60>` header.

Stop the dev server afterwards.

- [ ] **Step 2: Full E2E regression**

Prerequisites: Docker services running (`cd C:/YHA/006_Claude_Workspace/walmal && docker compose up -d --wait` if not). The Playwright config auto-starts the Spring backend JAR and the Next.js server on port 3001 with `.env.test.local`.

Run: `npx playwright test`
Expected: **96 passed**. If any auth/checkout test fails with a 429, the `.env.test.local` overrides are not being picked up — verify Task 2 Step 5 and that the test webServer loads `.env.test.local`.

- [ ] **Step 3: Update the security checklist**

In `tests/security/FRONTEND_CHECKLIST.md`. Do NOT touch anything related to AUTH-01 — it is out of scope for this plan even if it looks stale.

Detail rows:
- **SENS-06** row (line ~85): change status **FAIL** → **PASS (mitigated)**; replace the remediation text with: "Intentionally unauthenticated for guest checkout; mitigated by per-IP rate limiting (10 req/min, `src/lib/rate-limit.ts`) per docs/superpowers/specs/2026-07-10-payment-intent-rate-limiting-design.md."
- **API-03** row (line ~95): change status **FAIL** → **PASS**; replace the remediation text with: "In-memory per-IP fixed-window limits on payment-intent (10/min), login (5/min), register (3/min), refresh (20/min); env-overridable, 100k in `.env.test.local`. Per-IP keying trusts `x-forwarded-for` — effective only when a reverse proxy overwrites that header; direct-to-node deployments share one bucket."

Summary table (lines 13–26). WARNING: some existing PASS/FAIL counts are stale relative to the detail rows below them. After making the two detail-row changes above, recount each affected section's detail rows and set the summary numbers from the recount (do not just decrement):
- **Sensitive Data Handling** row (line ~18): recount section 4; expected `5 | 0`. Note → "payment-intent open for guest checkout by design; mitigated with per-IP rate limiting".
- **API Route Security** row (line ~19): recount section 5; expected `6 | 0` if API-03 was its only FAIL. Note → "mock routes auth-protected; rate limiting added".
- **Authorization (RBAC)** row (line ~16): recount section 2 (its detail rows may already be all PASS — the `4 | 1` was stale). Note → drop "rate limiting deferred".
- **Overall** line (~26): recompute total PASS/FAIL from the updated summary rows (AUTH-01 remains the only intentional FAIL from this plan's perspective).

Deferred-items note (lines 28–31): delete the **SENS-06/M2** and **API-03/M3** bullets (both now resolved); keep the AUTH-01 bullet unchanged.

Final scorecard line (~292): update the "Manual checklist" row to the new totals, listing AUTH-01 as the remaining deferred item.

- [ ] **Step 4: Commit**

```bash
git add tests/security/FRONTEND_CHECKLIST.md
git commit -m "docs(security): mark API-03 PASS and SENS-06 mitigated after rate limiting"
```
