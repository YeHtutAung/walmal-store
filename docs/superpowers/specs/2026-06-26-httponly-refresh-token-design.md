# Design: Move Refresh Token to httpOnly Cookie

**Date:** 2026-06-26  
**Status:** Approved  
**Risk:** AUTH-01 (refresh token in localStorage is readable by any JS — XSS session hijacking)

---

## Problem

The refresh token is currently persisted in `localStorage` via Zustand's `persist` middleware (`auth-storage` key). Any XSS script can read it and silently obtain new access tokens indefinitely. Moving it to an httpOnly cookie makes it invisible to JavaScript entirely.

---

## Architecture

A thin Next.js proxy layer intercepts all four auth calls. The browser never speaks to Spring Boot directly for auth. The refresh token never appears in the browser's JavaScript context.

```
Browser ─── POST /api/auth/login ────► Next.js route ───► Spring Boot /auth/login
                                              │
                                 sets walmal-rt httpOnly cookie
                                 returns { accessToken } only

Browser ─── POST /api/auth/refresh ──► Next.js route ───► Spring Boot /auth/refresh
  (cookie sent automatically,                │               (reads token from cookie body)
   no JS involvement)              sets new walmal-rt cookie
                                   returns { accessToken } only

Browser ─── POST /api/auth/register ─► Next.js route ───► Spring Boot /auth/register
                                              │
                                 same pattern as login

Browser ─── POST /api/auth/logout ───► Next.js route ─── clears walmal-rt cookie
```

---

## New Files

### `src/app/api/auth/login/route.ts`
- Accepts `{ username, password }` from the browser
- Forwards to `${NEXT_PUBLIC_API_URL}/auth/login`
- On success: sets `walmal-rt` httpOnly cookie, returns `{ accessToken, tokenType, expiresIn }`
- On failure: forwards the error status and body unchanged

### `src/app/api/auth/register/route.ts`
- Same pattern as login; forwards `{ email, password, username }`

### `src/app/api/auth/refresh/route.ts`
- Reads `walmal-rt` cookie from the incoming request
- Forwards `{ refreshToken }` to `${NEXT_PUBLIC_API_URL}/auth/refresh`
- On success: sets new `walmal-rt` cookie, returns `{ accessToken, tokenType, expiresIn }`
- On 401/missing cookie: returns 401 (no cookie to clear)

### `src/app/api/auth/logout/route.ts`
- Clears `walmal-rt` cookie (MaxAge=0)
- Returns 204

---

## Cookie Policy

| Attribute | Value                                    |
|-----------|------------------------------------------|
| Name      | `walmal-rt`                              |
| HttpOnly  | `true`                                   |
| Secure    | `process.env.NODE_ENV === 'production'`  |
| SameSite  | `Strict`                                 |
| Path      | `/api/auth`                              |
| MaxAge    | `604800` (7 days, matching Spring token) |

`Path: /api/auth` ensures the cookie is only attached to requests to our four proxy routes — not to every API call.

---

## Modified Files

### `src/lib/api/auth.ts`
- All four functions use `fetch()` directly with a relative URL — **not** `apiClient`, which
  has `baseURL = NEXT_PUBLIC_API_URL` (the Spring Boot URL). Using `apiClient` would prepend
  the Spring URL and route the request to Spring instead of the Next.js proxy.
- `loginApi(username, password)` → `fetch('/api/auth/login', { method:'POST', ... })`
- `registerApi(email, password, username)` → `fetch('/api/auth/register', ...)`
- `refreshApi()` (renamed, no token arg) → `fetch('/api/auth/refresh', ...)`
- `logoutApi()` (new) → `fetch('/api/auth/logout', ...)`
- All functions set `Content-Type: application/json` and parse the JSON response, throwing on non-2xx.

### `src/types/auth.ts`
- `AuthResponse.refreshToken` removed (proxy strips it before responding to browser)
- New type `ClientAuthResponse = { accessToken: string; tokenType: string; expiresIn: number }`

### `src/store/auth-store.ts`
- `refreshToken: string | null` removed from `AuthState`
- `persist` middleware removed entirely — nothing needs localStorage persistence
- `login()` / `register()`: no refreshToken handling; call updated `loginApi`/`registerApi`
- `refresh()`: no token arg; calls `refreshApi()`; the cookie is sent automatically
- `logout()`: fire-and-forgets `logoutApi()` to clear server cookie, clears local state
- `setToken(token, user)`: `refreshToken` param removed

### `src/components/providers.tsx`
- `attemptSilentRefresh`: drops `if (!refreshToken) { set guest; return }` guard
- Calls `refreshApi()` directly — 401 response → catch → `status: 'guest'`
- Import: `refreshApi` replaces `refreshTokenApi`

---

## Unchanged

- `src/middleware.ts` — presence cookie (`walmal-auth`) check unchanged
- `src/app/api/v1/auth/*` — mock routes for dev-without-backend left as-is
- `tests/e2e/helpers.ts` — `gotoAndWaitForAuth` filters `resp.url().includes('/auth/refresh')`;
  `/api/auth/refresh` (new proxy URL) still contains that substring — no change needed.
  `waitForAuthReady` reads `localStorage.getItem('auth-storage')`, which will always return
  `null` after `persist` is removed. This helper is unused dead code; delete it from the file.
- All other E2E tests

---

## Error Handling

Each proxy route forwards the upstream HTTP status and body on failure so the client error-handling path (`ApiError`, `data?.detail`) is unchanged.

---

## Security Properties After This Change

| Property | Before | After |
|----------|--------|-------|
| Refresh token readable by JS | Yes (localStorage) | No (httpOnly) |
| Refresh token sent on cross-site requests | N/A (localStorage) | No (SameSite=Strict) |
| Refresh token sent to non-auth routes | N/A | No (Path=/api/auth) |
| XSS can steal refresh token | Yes | No |
| CSRF can trigger refresh | N/A | No (SameSite=Strict + POST) |
