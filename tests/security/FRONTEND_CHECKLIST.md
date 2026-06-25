# Walmal Store — Frontend Security Checklist

**Date:** 2026-06-25
**Target:** http://localhost:3000 (Next.js 15 / App Router)
**Backend:** http://localhost:8080/api/v1 (Spring Boot)
**ZAP Scan:** `tests/security/results/zap-frontend-report.{json,html}`
**Tester:** Claude Code (automated code review + OWASP ZAP baseline scan)

---

## Summary

| Category | PASS | FAIL | Notes |
|----------|------|------|-------|
| Authentication & Tokens | 3 | 3 | Tokens in localStorage, no server-side guard |
| Authorization (RBAC) | 3 | 2 | Client-side only, mock API routes unprotected |
| Input Validation & XSS | 5 | 1 | Open redirect via `next` param |
| Sensitive Data Handling | 4 | 1 | payment-intent unauthenticated |
| API Route Security | 2 | 4 | No auth on mock routes, no rate limit, no CORS |
| Session Management | 3 | 1 | No client-side token expiry check |
| Dependencies | 0 | 1 | 8 vulnerabilities (4 HIGH) |
| Security Headers | 0 | 6 | No CSP, X-Frame-Options, etc. |
| File Handling | N/A | N/A | No file uploads in this app |
| Third-Party Integrations | 3 | 0 | Stripe integration correct |

**Overall: 23 PASS / 19 FAIL**

---

## Checklist

### 1. Authentication & Tokens

| Check ID | Description | Status | Evidence / Notes |
|----------|-------------|--------|-----------------|
| AUTH-01 | JWT stored in httpOnly cookie (not localStorage) | **FAIL** | `refreshToken` stored in `localStorage` via Zustand persist (key: `auth-storage`, `partialize: (state) => ({ refreshToken: state.refreshToken })`). Access token is in-memory only (good), but refresh token in localStorage is exposed to XSS. **Remediation:** Move refresh token to httpOnly cookie via a `/api/auth/set-cookie` server route. |
| AUTH-02 | Token expiry validated on client | **FAIL** | JWT `exp` claim is never checked before use. `decodePayload()` in `auth-store.ts` parses payload but does not compare `exp` against `Date.now()`. An expired token will be sent to the backend until it gets a 401. **Remediation:** Add `if (payload.exp && payload.exp * 1000 < Date.now()) { throw new Error('Token expired') }` in the refresh and API call paths. |
| AUTH-03 | Refresh token rotation on login | PASS | `providers.tsx` → `attemptSilentRefresh()` fetches new access + refresh tokens on page load. Both mock routes and real Spring Boot backend issue new refresh tokens on each refresh call. |
| AUTH-04 | Token not leaked in network logs, error messages, or console | PASS | No `console.log(token)` in source. API error interceptor (`client.ts:35`) only fires in `development` mode and logs HTTP status + response data, not the Authorization header value. |
| AUTH-05 | Login form has CSRF protection | PASS | App uses stateless JWT Bearer tokens (not session cookies), so CSRF is not applicable for login. |
| AUTH-06 | Base64url decode consistent across codebase | **FAIL** | `providers.tsx:29` uses raw `atob(data.accessToken.split('.')[1])` without the base64url→base64 conversion that `auth-store.ts` correctly applies via `decodePayload()`. Real Spring Boot JWTs use base64url encoding, so this will silently fail and produce `undefined` for `payload.username`. **Remediation:** Reuse the `decodePayload()` helper from `auth-store.ts` in `providers.tsx`. |

---

### 2. Authorization (RBAC)

| Check ID | Description | Status | Evidence / Notes |
|----------|-------------|--------|-----------------|
| RBAC-01 | Role-based access enforced on protected routes (/account) | **FAIL** | `GET /account` returns HTTP **200** to unauthenticated requests. The guard in `src/app/(account)/layout.tsx` uses `useEffect` (client-side only). Server renders the page shell with 200, leaking route existence and structure. **Remediation:** Add `src/middleware.ts` to redirect unauthenticated users server-side before the page renders. |
| RBAC-02 | Role mismatch redirects to login (not blank page or 403 leak) | PASS | Admin login is caught in `auth-store.ts` by checking `payload.role !== 'CUSTOMER'` and throwing `'This store is for customers only.'` — displayed cleanly in the login form, no 403 leak. |
| RBAC-03 | Admin endpoints reject non-admin users | PASS | No `/admin` route exists. The Spring Boot admin endpoints are not proxied through Next.js. |
| RBAC-04 | POS-only endpoints reject non-POS users | PASS | No POS endpoints exist in this Next.js frontend. |
| RBAC-05 | Navigation hides unauthorized links | PASS | `site-header.tsx` conditionally shows "My Account" and "Logout" only when `status === 'authenticated'`. No hidden privileged URLs found in rendered HTML. |
| RBAC-06 | Mock API routes enforce authentication | **FAIL** | `POST /api/v1/orders`, `GET /api/v1/orders`, `GET /api/v1/cart`, `PUT /api/v1/cart` all return 200 without any Authorization header. Verified: `curl -X POST http://localhost:3000/api/v1/orders -d '{...}'` creates an order anonymously. **Remediation:** Add `if (!req.headers.get('authorization')?.startsWith('Bearer ')) return NextResponse.json({error:'Unauthorized'},{status:401})` to protected mock routes. |

---

### 3. Input Validation & XSS Prevention

| Check ID | Description | Status | Evidence / Notes |
|----------|-------------|--------|-----------------|
| XSS-01 | No `dangerouslySetInnerHTML` in application code | PASS | `grep -rn dangerouslySetInnerHTML src/` returns zero results from application code. Next.js internal error component uses it in vendor bundle only — not attacker-controllable. |
| XSS-02 | Search input sanitized / no reflected XSS | PASS | `searchParams.get('q')` is used in `.toLowerCase().includes()` filter and rendered via React JSX (auto-escaped). Script tag in `?q=` returns escaped JSON — no XSS. |
| XSS-03 | Form inputs validated (email format, password strength) | PASS | Register form uses `type="email"` (browser format validation) and `minLength={8}`. Login uses `required`. |
| XSS-04 | No stored XSS in user-submitted data | PASS | No product reviews or user-generated content features exist. |
| XSS-05 | No reflected XSS in `order-confirmation?id=` | PASS | `orderId` rendered as `#{orderId.slice(-8).toUpperCase()}` — React escapes it. Confirmed no script execution. |
| XSS-06 | Open redirect via `?next=` param | **FAIL** | `login-form.tsx:22`: `const next = searchParams.get('next') ?? '/account'` passed directly to `router.replace(next)` without origin validation. An attacker can craft `/login?next=https://evil.com` and redirect users post-login. Same issue in `register-form.tsx`. **Remediation:** `const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/account'` |

---

### 4. Sensitive Data Handling

| Check ID | Description | Status | Evidence / Notes |
|----------|-------------|--------|-----------------|
| SENS-01 | Passwords never logged or sent in query strings | PASS | No `console.log(password)` in source. Password sent in POST body to `/api/v1/auth/login` only. |
| SENS-02 | Stripe card data never reaches Next.js backend | PASS | `stripe-payment.tsx` uses `stripe.confirmCardPayment()` — card data goes to Stripe's servers via the CardElement iframe only. Next.js receives only the `paymentIntentId` after success. |
| SENS-03 | No API keys in frontend code | PASS | `src/lib/stripe.ts` reads `process.env.STRIPE_SECRET_KEY` (server-side only). No `sk_live` or `sk_test` strings in source code. `.env.local` has placeholder values. `.gitignore` correctly excludes `.env*`. |
| SENS-04 | User PII not over-exposed in API responses | PASS | Order summaries expose only `id, status, totalAmount, currency, createdAt`. No email/phone/card data in frontend API responses. |
| SENS-05 | Error messages don't leak system details | PASS | `payment-intent/route.ts` catches and returns generic `{"error":"Failed to create payment intent"}`. API client shows detailed errors in dev mode only (`NODE_ENV === 'development'`). |
| SENS-06 | payment-intent endpoint requires authentication | **FAIL** | `POST /api/payment-intent` has no auth check. Any unauthenticated user can call it and trigger a Stripe PaymentIntent creation against your Stripe account. With real keys this wastes Stripe API credits and could flag account. **Remediation:** Verify `Authorization: Bearer <token>` header is present before calling `stripe.paymentIntents.create()`. |

---

### 5. API Route Security

| Check ID | Description | Status | Evidence / Notes |
|----------|-------------|--------|-----------------|
| API-01 | Public endpoints accessible without auth (products) | PASS | Product search and detail routes work without auth — appropriate for a public storefront. |
| API-02 | Protected routes reject unauthenticated requests | **FAIL** | `POST /api/v1/orders`, `GET /api/v1/orders`, `GET/PUT /api/v1/cart` all return 200 without a token. See RBAC-06. |
| API-03 | Rate limiting on sensitive endpoints | **FAIL** | No rate limiting on any Next.js API routes. The login endpoint can be brute-forced. **Remediation:** Add `@upstash/ratelimit` or similar, especially on `/api/v1/auth/login` and `/api/payment-intent`. |
| API-04 | No SQL injection in query string handling | PASS | No raw SQL in Next.js API routes. Product search uses `.includes()` on in-memory mock data. |
| API-05 | CORS explicitly configured | **FAIL** | No explicit `Access-Control-Allow-Origin` or `Cross-Origin-Resource-Policy` headers configured. ZAP confirmed CORP header missing on all 14 tested responses. **Remediation:** Add CORS headers in `next.config.ts` `headers()` config. |
| API-06 | Minio proxy path traversal prevention | PASS | `GET /api/minio/../../etc/passwd` returns 404. Next.js URL normalization prevents traversal. Encoded `%2e%2e` variant also returns 404. |

---

### 6. Session Management

| Check ID | Description | Status | Evidence / Notes |
|----------|-------------|--------|-----------------|
| SESS-01 | Logout clears token and Zustand state | PASS | `use-auth.ts:logout()` calls `store.logout()` (nulls token/refreshToken/user) and `useCartStore.clearCart()`. API 401 interceptor in `client.ts` also triggers logout + cart clear automatically. |
| SESS-02 | Token expiry handled proactively | **FAIL** | No client-side `exp` check. Silent refresh only runs on page load, not on an interval. A user staying on a page for >1 hour will have an expired token used until the next API call returns 401. **Remediation:** Add a periodic refresh timer in `AuthProvider` (every ~50 minutes), or check `exp` before each `apiClient` request. |
| SESS-03 | Concurrent sessions / session fixation | PASS | JWTs are stateless — no server-side session ID, no fixation risk. Each login issues a fresh token pair independent of previous sessions. |
| SESS-04 | Refresh token rotation (single-use) | PASS | Real Spring Boot backend uses single-use refresh tokens. Mock routes return a new refresh token on each call. |

---

### 7. Dependencies & Libraries

| Check ID | Description | Status | Evidence / Notes |
|----------|-------------|--------|-----------------|
| DEP-01 | No outdated vulnerable dependencies | **FAIL** | `npm audit` reports **8 vulnerabilities: 4 HIGH, 3 MODERATE, 1 LOW**. HIGH: `vite` (NTLMv2 hash disclosure on Windows via UNC paths, `server.fs.deny` bypass), `undici` (TLS cert validation bypass, HTTP header injection, WebSocket DoS, cross-origin routing via SOCKS5), `form-data` (CRLF injection), `hono` (path traversal on Windows, CORS wildcard with credentials). **Remediation:** Run `npm audit fix`. Review `postcss` separately (its fix requires `npm audit fix --force` which downgrades Next.js). |
| DEP-02 | Stripe.js loaded correctly | PASS | `loadStripe()` from `@stripe/stripe-js` loads from Stripe's CDN with built-in integrity verification. No self-hosted Stripe.js. |
| DEP-03 | shadcn/ui components used safely | PASS | No `dangerouslySetInnerHTML` in shadcn components used. All form inputs use React controlled components. |

---

### 8. Security Headers

| Check ID | Description | Status | Evidence / Notes |
|----------|-------------|--------|-----------------|
| HDR-01 | Content-Security-Policy (CSP) | **FAIL** | **ZAP confirmed [10038]:** No CSP header on any response (11 URLs tested). Critical for XSS mitigation. **Remediation:** See remediation block below. |
| HDR-02 | X-Frame-Options | **FAIL** | Not set. Pages are frameable — enables clickjacking. **Remediation:** `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`. |
| HDR-03 | X-Content-Type-Options | **FAIL** | Not set. Enables MIME-type sniffing attacks. **Remediation:** `X-Content-Type-Options: nosniff`. |
| HDR-04 | X-Powered-By disclosure | **FAIL** | **ZAP confirmed [10037]:** `X-Powered-By: Next.js` on all responses (11 URLs). Discloses framework. **Remediation:** Add `poweredByHeader: false` in `next.config.ts`. |
| HDR-05 | Referrer-Policy | **FAIL** | Not set. Referrer header sent to third-party origins may leak path info. **Remediation:** `Referrer-Policy: strict-origin-when-cross-origin`. |
| HDR-06 | Permissions-Policy | **FAIL** | **ZAP confirmed [10063]:** No `Permissions-Policy` header (13 URLs). **Remediation:** `Permissions-Policy: camera=(), microphone=(), geolocation=()`. |
| HDR-07 | HSTS | N/A | Dev runs on HTTP. Configure in Nginx/CDN for production HTTPS. |

---

### 9. File Handling

| Check ID | Description | Status | Evidence / Notes |
|----------|-------------|--------|-----------------|
| FILE-01 | File upload handling | N/A | No file upload functionality exists in this storefront. |

---

### 10. Third-Party Integrations

| Check ID | Description | Status | Evidence / Notes |
|----------|-------------|--------|-----------------|
| 3P-01 | Stripe: No card data in logs | PASS | Card data handled entirely in Stripe's CardElement iframe. `stripe-payment.tsx` only logs `stripeError.message` on failure — never card numbers, CVV, or expiry. |
| 3P-02 | No hardcoded API keys in code | PASS | All keys via `process.env`. `STRIPE_SECRET_KEY` server-side only. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is intentionally public. No `sk_live`/`sk_test` literals in source. |
| 3P-03 | Stripe webhook verification | N/A | No webhook endpoint in Next.js. Webhooks handled by Spring Boot backend. |

---

## ZAP Baseline Scan Results

**Scan:** OWASP ZAP `zap-baseline.py` against `http://host.docker.internal:3000`
**Result:** `WARN-NEW: 8 | FAIL-NEW: 0 | PASS: 58`

| ZAP Rule ID | Alert | Risk | Occurrences |
|-------------|-------|------|-------------|
| 10020 | Missing Anti-clickjacking Header (X-Frame-Options) | Medium | 11 |
| 10021 | X-Content-Type-Options header missing | Low | 12 |
| 10037 | X-Powered-By header present | Low | 11 |
| 10038 | Content-Security-Policy not set | Medium | 11 |
| 10063 | Permissions-Policy not set | Low | 13 |
| 10096 | Timestamp Disclosure (Unix) in compiled JS | Informational | 1 |
| 10110 | Dangerous JS Functions in vendor bundles | Low | 2 (turbopack/React internals — not app code) |
| 90004 | Cross-Origin-Resource-Policy header missing | Low | 14 |

No CRITICAL or HIGH automated alerts. Full reports: `tests/security/results/zap-frontend-report.{json,html}`

---

## Remediation Plan

### HIGH Priority (fix before production deployment)

**H1 — Add security headers (HDR-01 to HDR-06)**

In `next.config.ts`:
```ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://js.stripe.com",
          "frame-src https://js.stripe.com",
          "connect-src 'self' https://api.stripe.com http://localhost:8080",
          "img-src 'self' data: https:",
          "style-src 'self' 'unsafe-inline'",
        ].join('; '),
      },
    ],
  }]
},
poweredByHeader: false,
```

**H2 — Fix vulnerable dependencies (DEP-01)**
```bash
npm audit fix
```

**H3 — Move refresh token to httpOnly cookie (AUTH-01)**

Add `src/app/api/auth/set-cookie/route.ts` that sets `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh`. Update `auth-store.ts` to no longer persist `refreshToken` via Zustand.

**H4 — Fix open redirect in login/register (XSS-06)**

In `login-form.tsx` and `register-form.tsx`:
```ts
const rawNext = searchParams.get('next') ?? '/account'
const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/account'
```

**H5 — Add server-side route protection (RBAC-01)**

Create `src/middleware.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
export function middleware(req: NextRequest) {
  const isAccountRoute = req.nextUrl.pathname.startsWith('/account')
  const hasRefreshCookie = req.cookies.has('refresh_token') // after H3
  if (isAccountRoute && !hasRefreshCookie) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.url)
    )
  }
}
export const config = { matcher: ['/account/:path*'] }
```

### MEDIUM Priority

**M1 — Add auth checks to mock API routes (RBAC-06, API-02)**

Helper for mock routes:
```ts
function requireMockAuth(req: Request): Response | null {
  if (!req.headers.get('authorization')?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }
  return null
}
```

**M2 — Add auth check to payment-intent (SENS-06)**

In `src/app/api/payment-intent/route.ts`:
```ts
const auth = req.headers.get('authorization')
if (!auth?.startsWith('Bearer ')) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**M3 — Add rate limiting (API-03)**

Use `@upstash/ratelimit` or a simple IP-based limiter on `/api/v1/auth/login` and `/api/payment-intent`.

**M4 — Fix base64url decode in providers.tsx (AUTH-06)**

Replace `atob(data.accessToken.split('.')[1])` in `providers.tsx:29` with `decodePayload(data.accessToken)` imported from `@/store/auth-store`.

**M5 — Add proactive token expiry handling (AUTH-02, SESS-02)**

Add `exp` check in `auth-store.ts:refresh()` and add a periodic refresh interval in `providers.tsx` (every 50 minutes).

### LOW Priority

**L1 — Add explicit CORS headers (API-05)**

Add `Cross-Origin-Resource-Policy: same-origin` to the headers config in `next.config.ts`.

---

## Success Criteria Assessment

| Criterion | Result |
|-----------|--------|
| No CRITICAL vulnerabilities | PASS — ZAP found 0 CRITICAL/HIGH automated alerts |
| No HIGH vulnerabilities unaddressed | FAIL — 4 HIGH npm audit vulns; fixable with `npm audit fix` |
| Manual checklist all PASS | FAIL — 19 items FAIL (see above) |
| Zero hardcoded secrets in code | PASS — All keys via `process.env` |
| JWT stored securely (httpOnly cookie) | FAIL — Refresh token in localStorage |
| RBAC enforced on all protected routes | FAIL — Client-side only; mock routes unprotected |
| Stripe integration secure (no card data logged) | PASS — CardElement used correctly |
