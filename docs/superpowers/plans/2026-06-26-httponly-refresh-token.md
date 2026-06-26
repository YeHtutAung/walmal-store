# httpOnly Refresh Token Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the refresh token from localStorage (readable by XSS) into an httpOnly cookie managed by four Next.js proxy routes, so JavaScript can never access it.

**Architecture:** Four new Next.js API routes (`/api/auth/{login,register,refresh,logout}`) sit between the browser and Spring Boot. Each login/register proxy strips `refreshToken` from the Spring response and stores it in an httpOnly cookie. The refresh proxy reads the cookie, forwards it to Spring, and rotates the cookie. The browser only ever receives `accessToken`. `auth-store.ts` is simplified — no `persist` middleware, no `refreshToken` state.

**Tech Stack:** Next.js 16 App Router route handlers, `fetch()` (no axios for the proxy layer), Zustand (without persist), Playwright E2E tests.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/api/auth/login/route.ts` | Proxy login; set httpOnly cookie |
| Create | `src/app/api/auth/register/route.ts` | Proxy register; set httpOnly cookie |
| Create | `src/app/api/auth/refresh/route.ts` | Read cookie; proxy refresh; rotate cookie |
| Create | `src/app/api/auth/logout/route.ts` | Clear httpOnly cookie |
| Modify | `src/types/auth.ts` | Add `ClientAuthResponse` (no refreshToken) |
| Modify | `src/lib/api/auth.ts` | Replace apiClient calls with fetch() to proxy routes |
| Modify | `src/store/auth-store.ts` | Remove refreshToken field + persist middleware |
| Modify | `src/components/providers.tsx` | Drop refreshToken guard; call refreshApi() |
| Modify | `tests/e2e/helpers.ts` | Delete dead `waitForAuthReady` function |

---

## Task 1: Create the four proxy route files

**Files:**
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/refresh/route.ts`
- Create: `src/app/api/auth/logout/route.ts`

These files are self-contained — they call Spring Boot via `fetch` server-side and set/read cookies. No existing files are touched, so this task is safe to commit alone.

- [ ] **Step 1.1: Create `src/app/api/auth/login/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'

const SPRING_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
const SECURE = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const upstream = await fetch(`${SPRING_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await upstream.json()
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status })
  }
  const { refreshToken, ...clientData } = data
  const res = NextResponse.json(clientData)
  res.cookies.set('walmal-rt', refreshToken, {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
```

- [ ] **Step 1.2: Create `src/app/api/auth/register/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'

const SPRING_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
const SECURE = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const upstream = await fetch(`${SPRING_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await upstream.json()
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status })
  }
  const { refreshToken, ...clientData } = data
  const res = NextResponse.json(clientData)
  res.cookies.set('walmal-rt', refreshToken, {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
```

- [ ] **Step 1.3: Create `src/app/api/auth/refresh/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'

const SPRING_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
const SECURE = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('walmal-rt')?.value
  if (!refreshToken) {
    return NextResponse.json({ code: 'NO_COOKIE', message: 'No refresh token cookie.' }, { status: 401 })
  }
  const upstream = await fetch(`${SPRING_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const data = await upstream.json()
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status })
  }
  const { refreshToken: newRefreshToken, ...clientData } = data
  const res = NextResponse.json(clientData)
  res.cookies.set('walmal-rt', newRefreshToken, {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
```

- [ ] **Step 1.4: Create `src/app/api/auth/logout/route.ts`**

```typescript
import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({}, { status: 200 })
  res.cookies.set('walmal-rt', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 0,
  })
  return res
}
```

- [ ] **Step 1.5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 1.6: Commit**

```bash
git add src/app/api/auth/
git commit -m "feat(auth): add Next.js proxy routes for httpOnly refresh token cookie"
```

---

## Task 2: Update types and the auth API functions

**Files:**
- Modify: `src/types/auth.ts`
- Modify: `src/lib/api/auth.ts`

`auth.ts` imports the new `ClientAuthResponse` type. Nothing else imports `ClientAuthResponse` yet, so there are no downstream TS errors from this task alone.

- [ ] **Step 2.1: Replace `src/types/auth.ts`**

```typescript
export interface CustomerUser {
  id: string
  username: string
}

// What the browser receives from our proxy routes (no refreshToken)
export interface ClientAuthResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
}

// Full Spring Boot response — only used server-side inside proxy routes
export interface AuthResponse extends ClientAuthResponse {
  refreshToken: string
  role: string
}
```

- [ ] **Step 2.2: Replace `src/lib/api/auth.ts`**

Important notes:
- Use `fetch()` with **relative** URLs — NOT `apiClient`, which prepends `NEXT_PUBLIC_API_URL` (the Spring Boot base) and would bypass the proxy entirely.
- Throw `ApiError` (from `./client`) so `login-form.tsx`'s `err instanceof ApiError` branch keeps working and continues to show "Invalid username or password." for wrong credentials.
- Keep `loginApi` and `registerApi` names unchanged (auth-store.ts uses them via dynamic import).
- Rename `refreshTokenApi` → `refreshApi` (no token argument — cookie is sent automatically).
- Add `logoutApi` (fire-and-forget, no response body needed).

```typescript
import type { ClientAuthResponse } from '@/types/auth'
import { ApiError } from './client'

async function authFetch(path: string, body?: unknown): Promise<ClientAuthResponse> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(res.status, data?.code ?? 'UNKNOWN', data?.detail ?? data?.message ?? 'Request failed')
  }
  return res.json() as Promise<ClientAuthResponse>
}

export const loginApi = (username: string, password: string) =>
  authFetch('/api/auth/login', { username, password })

export const registerApi = (email: string, password: string, username: string) =>
  authFetch('/api/auth/register', { email, password, username })

export const refreshApi = () => authFetch('/api/auth/refresh')

export async function logoutApi(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' })
}
```

- [ ] **Step 2.3: Check TypeScript — expect errors only in auth-store and providers**

```bash
npx tsc --noEmit
```

Expected: TS errors only in `src/store/auth-store.ts` (imports `refreshTokenApi`, uses `refreshToken` state) and `src/components/providers.tsx` (passes `refreshToken` to `setToken`). These will be fixed in Task 3. Any error in any other file is unexpected — fix it before continuing.

- [ ] **Step 2.4: Commit**

```bash
git add src/types/auth.ts src/lib/api/auth.ts
git commit -m "feat(auth): add ClientAuthResponse type and fetch-based auth API functions"
```

---

## Task 3: Update auth-store and providers (do together — tightly coupled)

**Files:**
- Modify: `src/store/auth-store.ts`
- Modify: `src/components/providers.tsx`

These must be updated in the same commit. `setToken`'s signature changes from 3 args to 2, and both files call it. Do not run the E2E tests until both files are updated.

- [ ] **Step 3.1: Replace `src/store/auth-store.ts`**

Key changes from current:
- Remove the entire `persist(...)` wrapper — just `create<AuthState>()(...)`.
- Remove `refreshToken: string | null` from `AuthState` and all state initializations.
- `login()` / `register()`: destructure only `{ accessToken }` from response.
- `refresh()`: remove `storedRefresh` check; call `refreshApi()` with no arg; keep the >5-min expiry optimization on the access token.
- `logout()`: fire-and-forget `logoutApi()` to clear the server-side cookie.
- `setToken(token, user)`: 2-arg signature.

```typescript
import { create } from 'zustand'
import type { CustomerUser } from '@/types/auth'

interface AuthState {
  token: string | null
  user: CustomerUser | null
  status: 'idle' | 'loading' | 'authenticated' | 'guest'
  login: (username: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  refresh: () => Promise<void>
  logout: () => void
  setToken: (token: string, user: CustomerUser) => void
}

function setAuthCookie(authenticated: boolean) {
  if (typeof document === 'undefined') return
  document.cookie = authenticated
    ? 'walmal-auth=1; SameSite=Strict; Path=/'
    : 'walmal-auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; Path=/'
}

export function decodePayload(token: string): Record<string, string> {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return {}
  }
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: null,
  user: null,
  status: 'idle',

  login: async (username, password) => {
    set({ status: 'loading' })
    try {
      const { loginApi } = await import('@/lib/api/auth')
      const { accessToken } = await loginApi(username, password)
      const payload = decodePayload(accessToken)
      if (payload.role !== 'CUSTOMER') {
        set({ status: 'guest' })
        throw new Error('This store is for customers only.')
      }
      set({ token: accessToken, user: { id: payload.sub, username: payload.username }, status: 'authenticated' })
      setAuthCookie(true)
    } catch (e) {
      if (get().status !== 'guest') set({ status: 'guest' })
      throw e
    }
  },

  register: async (email, password, username) => {
    set({ status: 'loading' })
    const { registerApi } = await import('@/lib/api/auth')
    const { accessToken } = await registerApi(email, password, username)
    const payload = decodePayload(accessToken)
    set({ token: accessToken, user: { id: payload.sub, username: payload.username }, status: 'authenticated' })
    setAuthCookie(true)
  },

  refresh: async () => {
    // Skip if the access token still has more than 5 minutes remaining
    const currentToken = get().token
    if (currentToken) {
      const payload = decodePayload(currentToken)
      const exp = Number(payload.exp)
      if (exp && exp * 1000 - Date.now() > 5 * 60 * 1000) return
    }
    try {
      const { refreshApi } = await import('@/lib/api/auth')
      const { accessToken } = await refreshApi()
      const payload = decodePayload(accessToken)
      set({ token: accessToken, user: { id: payload.sub, username: payload.username }, status: 'authenticated' })
    } catch {
      set({ status: 'guest' })
    }
  },

  logout: () => {
    set({ token: null, user: null, status: 'guest' })
    setAuthCookie(false)
    // Fire-and-forget: clear the httpOnly walmal-rt cookie server-side
    import('@/lib/api/auth').then(({ logoutApi }) => logoutApi()).catch(() => {})
  },

  setToken: (token, user) => {
    set({ token, user, status: 'authenticated' })
    setAuthCookie(true)
  },
}))
```

- [ ] **Step 3.2: Replace `src/components/providers.tsx`**

Key changes from current:
- Import `refreshApi` instead of `refreshTokenApi`.
- Remove `refreshToken` from the destructured store state.
- Drop the `if (!refreshToken) { set guest; return }` guard — a missing cookie returns 401 from the proxy and the catch block handles it.
- `setToken` call: 2 args `(data.accessToken, { id, username })`.

```typescript
'use client'

import { useEffect } from 'react'
import { useAuthStore, decodePayload } from '@/store/auth-store'
import { useCartStore } from '@/store/cart-store'
import { refreshApi } from '@/lib/api/auth'
import { fetchServerCart, syncServerCart } from '@/lib/api/cart'
import { ApiError } from '@/lib/api/client'

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setToken } = useAuthStore()
  const cartStore = useCartStore()

  useEffect(() => {
    let refreshInterval: ReturnType<typeof setInterval> | null = null

    async function attemptSilentRefresh() {
      const { status } = useAuthStore.getState()
      if (status !== 'idle') return

      try {
        const data = await refreshApi()
        const payload = decodePayload(data.accessToken)
        setToken(data.accessToken, { id: payload.sub, username: payload.username })

        // Proactively refresh every 50 minutes for long-lived sessions
        refreshInterval = setInterval(() => {
          if (useAuthStore.getState().status === 'authenticated') {
            useAuthStore.getState().refresh()
          }
        }, 50 * 60 * 1000)

        try {
          const serverItems = await fetchServerCart()
          cartStore.mergeGuestCart(serverItems)
          await syncServerCart(useCartStore.getState().items)
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) {
            // Unexpected cart sync error — ignore silently
          }
        }
      } catch {
        useAuthStore.setState({ status: 'guest' })
      }
    }

    attemptSilentRefresh()

    return () => {
      if (refreshInterval) clearInterval(refreshInterval)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
```

- [ ] **Step 3.3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: zero errors. Fix any error before running tests.

- [ ] **Step 3.4: Run the auth E2E tests across all browsers**

```bash
npx playwright test tests/e2e/auth.spec.ts --reporter=list
```

Expected: all 24 tests pass (8 tests × 3 browsers). If any fail, fix before proceeding.

- [ ] **Step 3.5: Commit**

```bash
git add src/store/auth-store.ts src/components/providers.tsx
git commit -m "feat(auth): remove refreshToken from client state; route all auth through httpOnly cookie proxy"
```

---

## Task 4: Cleanup and full verification

**Files:**
- Modify: `tests/e2e/helpers.ts`

- [ ] **Step 4.1: Delete `waitForAuthReady` from `tests/e2e/helpers.ts`**

Remove the entire `waitForAuthReady` export function (currently the last ~18 lines of the file). It reads `localStorage.getItem('auth-storage')` which is always `null` now that the `persist` middleware is removed. It is not called anywhere in the test suite — safe to delete.

- [ ] **Step 4.2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4.3: Run the full E2E suite**

```bash
npx playwright test --reporter=list
```

Expected: 96 tests pass across chromium, firefox, and webkit.

- [ ] **Step 4.4: Commit and push**

```bash
git add tests/e2e/helpers.ts
git commit -m "chore(tests): remove dead waitForAuthReady helper (persist middleware removed)"
git push
```
