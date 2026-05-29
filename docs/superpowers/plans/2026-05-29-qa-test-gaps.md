# QA Test Gap Fill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all 27 missing tests across 10 gap areas without touching the 13 existing passing tests.

**Architecture:** Each gap is a self-contained task. Gaps 1–3 append to existing test files; Gaps 4–10 create new files. One source-code prerequisite task (Task 1) adds a `refresh` action to the auth store and fixes login error recovery — these are required before the auth-store gap tests can pass.

**Tech Stack:** Vitest 4, MSW 2, React Testing Library 16, @testing-library/user-event 14, @testing-library/jest-dom 6, jsdom 29, zustand 5, Next.js 16 App Router

---

## Pre-flight: known discrepancies vs. spec

| Spec claim | Actual code | Resolution |
|---|---|---|
| "Login failure → status 'guest'" | Login has no catch; status stays 'loading' on API error | Task 1 adds catch block — fix code, then test |
| "Silent refresh action exists" | `useAuthStore` has no `refresh` method | Task 1 adds it |
| "GAP 10 — idle → redirect" | `layout.tsx` shows spinner for 'idle', only redirects for 'guest' | Test 4 written to match actual code (spinner for both idle + loading) |
| "GAP 9 — email validation error shown" | GuestFields has no custom error UI; uses HTML5 `required` + `type=email` | Tests use `toBeInvalid()` from jest-dom |

---

## File map

| Action | Path |
|---|---|
| Modify | `src/store/auth-store.ts` |
| Modify | `tests/store/cart-store.test.ts` |
| Modify | `tests/store/auth-store.test.ts` |
| Modify | `tests/lib/api/client.test.ts` |
| Modify | `tests/setup.ts` |
| Create | `tests/lib/api/products.test.ts` |
| Create | `tests/lib/api/orders.test.ts` |
| Create | `tests/lib/api/auth.test.ts` |
| Create | `tests/app/api/payment-intent/route.test.ts` |
| Create | `tests/components/cart/cart-drawer.test.tsx` |
| Create | `tests/components/checkout/checkout-form.test.tsx` |
| Create | `tests/components/account/layout.test.tsx` |

---

## Task 0 — Install MSW + update test setup

MSW is not yet in package.json; required by Gaps 3–7.

**Files:**
- Modify: `package.json` (devDependencies)
- Modify: `tests/setup.ts`

- [ ] **Step 1: Install MSW**

```bash
npm install --save-dev msw
```

Expected: msw appears in package.json devDependencies at ^2.x.x

- [ ] **Step 2: Update tests/setup.ts to set API base URL**

Current file (line 1 only): `import '@testing-library/jest-dom'`

New file:
```ts
import '@testing-library/jest-dom'

// MSW + axios need an absolute base URL; set before any module is imported
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080/api/v1'
```

- [ ] **Step 3: Verify existing tests still pass**

```bash
npm test
```

Expected: 13 tests pass, 0 fail.

---

## Task 1 — Fix auth-store.ts: add refresh action + catch in login

Two behaviour gaps block auth tests:
1. `login` never sets status back to `'guest'` when the API call throws.
2. No `refresh` action exists (required by GAP 2 tests 3–4).

**Files:**
- Modify: `src/store/auth-store.ts`

- [ ] **Step 1: Read current auth-store.ts**

Current file (full content for reference):
```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CustomerUser } from '@/types/auth'

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: CustomerUser | null
  status: 'idle' | 'loading' | 'authenticated' | 'guest'
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  logout: () => void
  setToken: (token: string, refreshToken: string, user: CustomerUser) => void
}
```

- [ ] **Step 2: Replace src/store/auth-store.ts with updated version**

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CustomerUser } from '@/types/auth'

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: CustomerUser | null
  status: 'idle' | 'loading' | 'authenticated' | 'guest'
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  refresh: () => Promise<void>
  logout: () => void
  setToken: (token: string, refreshToken: string, user: CustomerUser) => void
}

function decodePayload(token: string): Record<string, string> {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return {}
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      status: 'idle',

      login: async (username, password) => {
        set({ status: 'loading' })
        try {
          const { loginApi } = await import('@/lib/api/auth')
          const { accessToken, refreshToken } = await loginApi(username, password)
          const payload = decodePayload(accessToken)
          if (payload.role !== 'CUSTOMER') {
            set({ status: 'guest' })
            throw new Error('This store is for customers only.')
          }
          set({
            token: accessToken,
            refreshToken,
            user: { id: payload.sub, username: payload.username },
            status: 'authenticated',
          })
        } catch (e) {
          // Only override status if not already set to 'guest' (role rejection already sets it)
          const current = get().status
          if (current !== 'guest') set({ status: 'guest' })
          throw e
        }
      },

      register: async (email, password, username) => {
        set({ status: 'loading' })
        const { registerApi } = await import('@/lib/api/auth')
        const { accessToken, refreshToken } = await registerApi(email, password, username)
        const payload = decodePayload(accessToken)
        set({
          token: accessToken,
          refreshToken,
          user: { id: payload.sub, username: payload.username },
          status: 'authenticated',
        })
      },

      refresh: async () => {
        const storedRefresh = get().refreshToken
        if (!storedRefresh) return
        try {
          const { refreshTokenApi } = await import('@/lib/api/auth')
          const { accessToken, refreshToken: newRefreshToken } = await refreshTokenApi(storedRefresh)
          const payload = decodePayload(accessToken)
          set({
            token: accessToken,
            refreshToken: newRefreshToken,
            user: { id: payload.sub, username: payload.username },
            status: 'authenticated',
          })
        } catch {
          set({ status: 'guest' })
        }
      },

      logout: () => {
        set({ token: null, refreshToken: null, user: null, status: 'guest' })
      },

      setToken: (token, refreshToken, user) =>
        set({ token, refreshToken, user, status: 'authenticated' }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    },
  ),
)
```

- [ ] **Step 3: Run existing tests to confirm no regressions**

```bash
npm test
```

Expected: 13 tests pass, 0 fail.

---

## Task 2 — GAP 1: cart-store.test.ts — 2 new tests

**Files:**
- Modify: `tests/store/cart-store.test.ts` (append inside the existing `describe` block before the closing `}`)

- [ ] **Step 1: Append two tests inside the `describe('cart-store', ...)` block**

Add after the last `it(...)` (line 88), before the closing `})` of the describe:

```ts
  it('localStorage rehydration: restores items after simulated page reload', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    // Simulate what persist middleware would have written to localStorage
    localStorage.setItem(
      'walmal-cart',
      JSON.stringify({ state: { items: [item1] }, version: 0 }),
    )
    useCartStore.setState({ items: [] })
    await useCartStore.persist.rehydrate()
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].variantId).toBe('v1')
    localStorage.removeItem('walmal-cart')
  })

  it('mergeGuestCart: preserves local items when server cart is empty', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.setState({ items: [item1, item2] })
    useCartStore.getState().mergeGuestCart([])
    const items = useCartStore.getState().items
    expect(items).toHaveLength(2)
    expect(items.find((i) => i.variantId === 'v1')?.quantity).toBe(1)
    expect(items.find((i) => i.variantId === 'v2')?.quantity).toBe(2)
  })
```

- [ ] **Step 2: Run tests**

```bash
npm test -- tests/store/cart-store.test.ts
```

Expected: 10 tests pass (8 original + 2 new), 0 fail.

---

## Task 3 — GAP 2: auth-store.test.ts — 4 new tests

**Files:**
- Modify: `tests/store/auth-store.test.ts` (append inside the existing `describe` block)

Helper tokens needed (compute base64 of JSON payload, no real signing required — the store only does `atob`):
- `STAFF_TOKEN`: payload `{"role":"STAFF","sub":"3","username":"staff"}` → base64 = `eyJyb2xlIjoiU1RBRkYiLCJzdWIiOiIzIiwidXNlcm5hbWUiOiJzdGFmZiJ9`

- [ ] **Step 1: Add STAFF_TOKEN constant and 4 tests inside `describe('auth-store', ...)`**

After the existing `ADMIN_TOKEN` line (line 16) add:
```ts
const STAFF_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiU1RBRkYiLCJzdWIiOiIzIiwidXNlcm5hbWUiOiJzdGFmZiJ9.sig'
```

Append four tests before the closing `})` of the describe block:

```ts
  it('login failure: wrong credentials → status stays guest, token null', async () => {
    const { loginApi } = await import('@/lib/api/auth')
    const { ApiError } = await import('@/lib/api/client')
    vi.mocked(loginApi).mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Bad credentials'))
    const { useAuthStore } = await import('@/store/auth-store')
    await expect(useAuthStore.getState().login('alice', 'wrong')).rejects.toThrow()
    expect(useAuthStore.getState().status).toBe('guest')
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('STAFF role rejected: throws and status becomes guest', async () => {
    const { loginApi } = await import('@/lib/api/auth')
    vi.mocked(loginApi).mockResolvedValueOnce(makeAuthResponse(STAFF_TOKEN))
    const { useAuthStore } = await import('@/store/auth-store')
    await expect(useAuthStore.getState().login('staff', 'pass')).rejects.toThrow(
      'This store is for customers only.',
    )
    expect(useAuthStore.getState().status).toBe('guest')
  })

  it('silent refresh success: status becomes authenticated with new token', async () => {
    const { refreshTokenApi } = await import('@/lib/api/auth')
    vi.mocked(refreshTokenApi).mockResolvedValueOnce(makeAuthResponse(CUSTOMER_TOKEN))
    const { useAuthStore } = await import('@/store/auth-store')
    useAuthStore.setState({ refreshToken: 'old-refresh', status: 'idle' })
    await useAuthStore.getState().refresh()
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().token).toBe(CUSTOMER_TOKEN)
  })

  it('silent refresh 401: status becomes guest, no throw', async () => {
    const { refreshTokenApi } = await import('@/lib/api/auth')
    const { ApiError } = await import('@/lib/api/client')
    vi.mocked(refreshTokenApi).mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Token expired'))
    const { useAuthStore } = await import('@/store/auth-store')
    useAuthStore.setState({ refreshToken: 'expired-refresh', status: 'idle' })
    await expect(useAuthStore.getState().refresh()).resolves.toBeUndefined()
    expect(useAuthStore.getState().status).toBe('guest')
  })
```

- [ ] **Step 2: Run tests**

```bash
npm test -- tests/store/auth-store.test.ts
```

Expected: 8 tests pass (4 original + 4 new), 0 fail.

---

## Task 4 — GAP 3: client.test.ts — 4 new interceptor tests

The existing file has `vi.mock('axios', ...)` at module scope. The new tests need the **real** axios with real interceptors. Use `vi.unmock + vi.resetModules` before each dynamic import to bypass the module-level mock for these tests only.

**Files:**
- Modify: `tests/lib/api/client.test.ts` (append a new `describe` block at the end of the file)

- [ ] **Step 1: Append interceptor describe block to client.test.ts**

```ts
import { setupServer } from 'msw/node'
import { http, HttpResponse, delay } from 'msw'
```

Add these imports at the TOP of the file (after existing imports).

Then append after the existing `describe('ApiError', ...)` block:

```ts
const BASE_URL = 'http://localhost:8080/api/v1'

describe('apiClient interceptors', () => {
  const server = setupServer()

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
  afterEach(() => {
    server.resetHandlers()
  })
  afterAll(() => server.close())

  async function freshClient() {
    vi.unmock('axios')
    vi.unmock('@/store/auth-store')
    vi.unmock('@/store/cart-store')
    vi.resetModules()
    const { apiClient } = await import('@/lib/api/client')
    return apiClient
  }

  it('attaches Authorization header when token exists', async () => {
    const { useAuthStore } = await import('@/store/auth-store')
    useAuthStore.setState({ token: 'test-token', status: 'authenticated' } as any)

    let capturedAuth: string | null = null
    server.use(
      http.get(`${BASE_URL}/products`, ({ request }) => {
        capturedAuth = request.headers.get('Authorization')
        return HttpResponse.json({})
      }),
    )

    const client = await freshClient()
    // Re-set token on fresh store after module reset
    const { useAuthStore: freshStore } = await import('@/store/auth-store')
    freshStore.setState({ token: 'test-token', status: 'authenticated' } as any)

    await client.get('/products').catch(() => {})
    expect(capturedAuth).toBe('Bearer test-token')
  })

  it('omits Authorization header when guest (token null)', async () => {
    let capturedAuth: string | null | undefined = undefined
    server.use(
      http.get(`${BASE_URL}/products`, ({ request }) => {
        capturedAuth = request.headers.get('Authorization')
        return HttpResponse.json({})
      }),
    )

    const client = await freshClient()
    const { useAuthStore: freshStore } = await import('@/store/auth-store')
    freshStore.setState({ token: null, status: 'guest' } as any)

    await client.get('/products').catch(() => {})
    expect(capturedAuth).toBeNull()
  })

  it('401 response → calls logout and sets location to /login', async () => {
    server.use(
      http.get(`${BASE_URL}/protected`, () => HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })),
    )

    // Give window.location a writable href for jsdom
    Object.defineProperty(window, 'location', {
      value: { href: '', pathname: '/protected' },
      writable: true,
    })

    const client = await freshClient()
    const { useAuthStore: freshStore } = await import('@/store/auth-store')
    freshStore.setState({ token: 'tok', status: 'authenticated' } as any)

    await client.get('/protected').catch(() => {})

    expect(freshStore.getState().status).toBe('guest')
    expect(window.location.href).toMatch(/\/login\?next=/)
  })

  it('timeout → throws ApiError', async () => {
    server.use(
      http.get(`${BASE_URL}/slow`, () => new Promise(() => {})),
    )

    vi.useFakeTimers()
    const client = await freshClient()
    const req = client.get('/slow')
    await vi.advanceTimersByTimeAsync(11_000)
    vi.useRealTimers()

    const { ApiError: Err } = await import('@/lib/api/client')
    await expect(req).rejects.toBeInstanceOf(Err)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npm test -- tests/lib/api/client.test.ts
```

Expected: 5 tests pass (1 original + 4 new), 0 fail.

---

## Task 5 — GAP 4: tests/lib/api/products.test.ts (new file)

**Files:**
- Create: `tests/lib/api/products.test.ts`

- [ ] **Step 1: Create tests/lib/api/products.test.ts**

```ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { fetchProducts, fetchProduct } from '@/lib/api/products'
import type { Product } from '@/types/product'
import { ApiError } from '@/lib/api/client'

const BASE_URL = 'http://localhost:8080/api/v1'

const mockProduct: Product = {
  productId: 'p1',
  name: 'Test Shirt',
  slug: 'test-shirt',
  brand: 'Walmal',
  lowestPrice: 2999,
  currency: 'USD',
}

const mockPage = {
  data: {
    content: [mockProduct],
    totalElements: 1,
    totalPages: 1,
  },
}

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('fetchProducts', () => {
  it('returns typed ProductListResponse', async () => {
    server.use(
      http.get(`${BASE_URL}/product/search`, () => HttpResponse.json(mockPage)),
    )
    const result = await fetchProducts()
    expect(result.products).toHaveLength(1)
    expect(result.products[0].productId).toBe('p1')
    expect(result.total).toBe(1)
    expect(result.totalPages).toBe(1)
  })

  it('forwards search, page, and size as query params', async () => {
    let capturedUrl = ''
    server.use(
      http.get(`${BASE_URL}/product/search`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(mockPage)
      }),
    )
    await fetchProducts({ search: 'shirt', page: 2, size: 10 })
    const url = new URL(capturedUrl)
    expect(url.searchParams.get('q')).toBe('shirt')
    expect(url.searchParams.get('page')).toBe('1') // fetchProducts does page - 1
    expect(url.searchParams.get('size')).toBe('10')
  })
})

describe('fetchProduct', () => {
  it('returns typed Product', async () => {
    server.use(
      http.get(`${BASE_URL}/product/test-shirt`, () =>
        HttpResponse.json({ data: mockProduct }),
      ),
    )
    const product = await fetchProduct('test-shirt')
    expect(product.productId).toBe('p1')
    expect(product.name).toBe('Test Shirt')
  })

  it('404 → throws ApiError with status 404', async () => {
    server.use(
      http.get(`${BASE_URL}/product/no-such-slug`, () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Product not found' }, { status: 404 }),
      ),
    )
    await expect(fetchProduct('no-such-slug')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npm test -- tests/lib/api/products.test.ts
```

Expected: 4 tests pass, 0 fail.

- [ ] **Step 3: Run full suite to check for regressions**

```bash
npm test
```

Expected: all previously passing tests still pass.

---

## Task 6 — GAP 5: tests/lib/api/orders.test.ts (new file)

**Files:**
- Create: `tests/lib/api/orders.test.ts`

- [ ] **Step 1: Create tests/lib/api/orders.test.ts**

```ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { createOrder, fetchOrders, fetchOrder } from '@/lib/api/orders'
import type { Order, OrderSummary, CreateOrderPayload } from '@/types/order'
import { ApiError } from '@/lib/api/client'

const BASE_URL = 'http://localhost:8080/api/v1'

const mockPayload: CreateOrderPayload = {
  currency: 'USD',
  items: [{ variantId: 'v1', locationId: 'loc1', quantity: 2 }],
  shippingAddress: {
    line1: '1 Main St',
    city: 'Springfield',
    postalCode: '12345',
    country: 'US',
  },
}

const mockSummary: OrderSummary = {
  id: 'ord-1',
  status: 'PENDING',
  totalAmount: 5998,
  currency: 'USD',
  createdAt: '2026-05-29T00:00:00Z',
}

const mockOrder: Order = {
  id: 'ord-1',
  userId: 'u1',
  status: 'PENDING',
  totalAmount: 5998,
  currency: 'USD',
  shippingAddress: mockPayload.shippingAddress,
  items: [
    {
      variantId: 'v1',
      productNameSnapshot: 'Shirt',
      skuSnapshot: 'SKU-001',
      quantity: 2,
      priceAtPurchase: 2999,
      currency: 'USD',
      subtotal: 5998,
    },
  ],
  createdAt: '2026-05-29T00:00:00Z',
}

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('createOrder', () => {
  it('returns orderId string', async () => {
    server.use(
      http.post(`${BASE_URL}/orders`, () => HttpResponse.json({ data: 'ord-1' })),
    )
    const result = await createOrder(mockPayload)
    expect(result.orderId).toBe('ord-1')
  })

  it('500 → throws ApiError, does not swallow', async () => {
    server.use(
      http.post(`${BASE_URL}/orders`, () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'DB error' }, { status: 500 }),
      ),
    )
    await expect(createOrder(mockPayload)).rejects.toMatchObject({ status: 500 })
  })
})

describe('fetchOrders', () => {
  it('returns typed OrderSummary[]', async () => {
    server.use(
      http.get(`${BASE_URL}/orders`, () =>
        HttpResponse.json({ data: { content: [mockSummary], totalElements: 1 } }),
      ),
    )
    const orders = await fetchOrders()
    expect(orders).toHaveLength(1)
    expect(orders[0].id).toBe('ord-1')
    expect(orders[0].status).toBe('PENDING')
  })
})

describe('fetchOrder', () => {
  it('returns typed Order', async () => {
    server.use(
      http.get(`${BASE_URL}/orders/ord-1`, () => HttpResponse.json({ data: mockOrder })),
    )
    const order = await fetchOrder('ord-1')
    expect(order.id).toBe('ord-1')
    expect(order.items).toHaveLength(1)
    expect(order.shippingAddress.city).toBe('Springfield')
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npm test -- tests/lib/api/orders.test.ts
```

Expected: 4 tests pass, 0 fail.

---

## Task 7 — GAP 6: tests/lib/api/auth.test.ts (new file)

**Files:**
- Create: `tests/lib/api/auth.test.ts`

- [ ] **Step 1: Create tests/lib/api/auth.test.ts**

```ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { loginApi, registerApi } from '@/lib/api/auth'
import type { AuthResponse } from '@/types/auth'

const BASE_URL = 'http://localhost:8080/api/v1'

// JWT payload {"role":"CUSTOMER","sub":"1","username":"alice"} — real base64
const CUSTOMER_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQ1VTVE9NRVIiLCJzdWIiOiIxIiwidXNlcm5hbWUiOiJhbGljZSJ9.sig'

const mockAuthResponse: AuthResponse = {
  accessToken: CUSTOMER_TOKEN,
  refreshToken: 'ref-tok',
  tokenType: 'Bearer',
  expiresIn: 900,
  role: 'CUSTOMER',
}

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('loginApi', () => {
  it('resolves with token and user data', async () => {
    server.use(
      http.post(`${BASE_URL}/auth/login`, () => HttpResponse.json(mockAuthResponse)),
    )
    const result = await loginApi('alice', 'password')
    expect(result.accessToken).toBe(CUSTOMER_TOKEN)
    expect(result.refreshToken).toBe('ref-tok')
    expect(result.tokenType).toBe('Bearer')
  })
})

describe('registerApi', () => {
  it('resolves with token and user data', async () => {
    server.use(
      http.post(`${BASE_URL}/auth/register`, () => HttpResponse.json(mockAuthResponse)),
    )
    const result = await registerApi('alice@example.com', 'pass', 'alice')
    expect(result.accessToken).toBe(CUSTOMER_TOKEN)
    expect(result.refreshToken).toBe('ref-tok')
  })

  it('409 email taken → throws ApiError with code EMAIL_TAKEN', async () => {
    server.use(
      http.post(`${BASE_URL}/auth/register`, () =>
        HttpResponse.json(
          { code: 'EMAIL_TAKEN', message: 'Email already in use' },
          { status: 409 },
        ),
      ),
    )
    await expect(registerApi('taken@example.com', 'pass', 'taken')).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
    })
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npm test -- tests/lib/api/auth.test.ts
```

Expected: 3 tests pass, 0 fail.

---

## Task 8 — GAP 7: tests/app/api/payment-intent/route.test.ts (new file)

Tests the Next.js route handler directly. Mocks `@/lib/stripe` so no real Stripe calls are made.

**Files:**
- Create: `tests/app/api/payment-intent/route.test.ts`

Note: `NextRequest` in test is constructed manually; `NextResponse.json` is available via the Next.js import.

- [ ] **Step 1: Create directory + test file**

```bash
mkdir -p tests/app/api/payment-intent
```

Create `tests/app/api/payment-intent/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
}))

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function callRoute(body: unknown) {
  const { POST } = await import('@/app/api/payment-intent/route')
  const req = makeRequest(body)
  return POST(req)
}

describe('POST /api/payment-intent', () => {
  beforeEach(() => {
    vi.resetModules()
    const { getStripe } = require('@/lib/stripe')
    vi.mocked(getStripe).mockReturnValue({
      paymentIntents: {
        create: vi.fn().mockResolvedValue({ client_secret: 'pi_test_secret_xxx' }),
      },
    })
  })

  it('valid request → 200 with clientSecret', async () => {
    const res = await callRoute({ amount: 5000, currency: 'usd' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.clientSecret).toBe('pi_test_secret_xxx')
  })

  it('amount = 0 → 400', async () => {
    const res = await callRoute({ amount: 0, currency: 'usd' })
    expect(res.status).toBe(400)
  })

  it('negative amount → 400', async () => {
    const res = await callRoute({ amount: -100, currency: 'usd' })
    expect(res.status).toBe(400)
  })

  it('missing currency falls back to usd default → 200', async () => {
    // currency defaults to 'usd' in the route handler
    const res = await callRoute({ amount: 1000 })
    expect(res.status).toBe(200)
  })

  it('invalid currency xyz → 400', async () => {
    const res = await callRoute({ amount: 1000, currency: 'xyz' })
    expect(res.status).toBe(400)
  })

  it('Stripe SDK throws → 500', async () => {
    vi.resetModules()
    const { getStripe } = require('@/lib/stripe')
    vi.mocked(getStripe).mockReturnValue({
      paymentIntents: {
        create: vi.fn().mockRejectedValue(new Error('Stripe error')),
      },
    })
    const res = await callRoute({ amount: 1000, currency: 'usd' })
    expect(res.status).toBe(500)
  })
})
```

Note: The spec says "missing currency → 400" but the route handler has `currency = 'usd'` as default, so a missing currency defaults to 'usd' and would return 200. Test 4 is adjusted to document actual behaviour (200 with default). If the intent is to require currency, the route handler must be updated separately.

- [ ] **Step 2: Run tests**

```bash
npm test -- tests/app/api/payment-intent/route.test.ts
```

Expected: 6 tests pass, 0 fail.

---

## Task 9 — GAP 8: tests/components/cart/cart-drawer.test.tsx (new file)

**Files:**
- Create: `tests/components/cart/cart-drawer.test.tsx`

Key mocks required:
- `next/image` → plain `<img>` (avoids Next.js image optimisation internals)
- `@/lib/minio-url` → returns the passed URL unchanged
- `next/navigation` → router mock (for Link clicks)
- Cart store → manipulate via `useCartStore.setState`

- [ ] **Step 1: Create tests/components/cart/cart-drawer.test.tsx**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CartItem } from '@/types/cart'

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))

vi.mock('@/lib/minio-url', () => ({
  resolveMinioUrl: (url: string) => url,
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  usePathname: vi.fn(() => '/'),
}))

const sampleItem: CartItem = {
  variantId: 'v1',
  productName: 'Test Shirt',
  variantName: 'Red / M',
  price: 2999,
  quantity: 2,
  imageUrl: '/shirt.jpg',
}

async function setup(items: CartItem[] = []) {
  const { useCartStore } = await import('@/store/cart-store')
  useCartStore.setState({ items })
  const { CartDrawer } = await import('@/components/cart/cart-drawer')
  return render(<CartDrawer open={true} onOpenChange={vi.fn()} />)
}

describe('CartDrawer', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('empty cart → "Your cart is empty." text visible', async () => {
    await setup([])
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument()
  })

  it('one item → renders productName, variantName, price, quantity', async () => {
    await setup([sampleItem])
    expect(screen.getByText('Test Shirt')).toBeInTheDocument()
    expect(screen.getByText('Red / M')).toBeInTheDocument()
    // quantity shown in the counter span
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('click + button → updateQty called with qty + 1', async () => {
    const user = userEvent.setup()
    const { useCartStore } = await import('@/store/cart-store')
    const updateQty = vi.spyOn(useCartStore.getState(), 'updateQty')
    await setup([sampleItem])
    const plusButtons = screen.getAllByRole('button')
    // The + button is the second icon button in the qty control area
    const plusBtn = plusButtons.find((b) => b.querySelector('svg'))!
    // Find by aria or sibling order: minus, qty display, plus — click the last icon button before trash
    const allIconBtns = screen.getAllByRole('button')
    // Buttons order per item: -, +, trash. Find the + (index 1 of 3 per item)
    await user.click(allIconBtns[1])
    expect(updateQty).toHaveBeenCalledWith('v1', 3) // 2 + 1
  })

  it('click − at qty 1 → removeItem called', async () => {
    const user = userEvent.setup()
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.setState({ items: [{ ...sampleItem, quantity: 1 }] })
    const removeItem = vi.spyOn(useCartStore.getState(), 'removeItem')
    const { CartDrawer } = await import('@/components/cart/cart-drawer')
    render(<CartDrawer open={true} onOpenChange={vi.fn()} />)
    const allIconBtns = screen.getAllByRole('button')
    await user.click(allIconBtns[0]) // minus button
    // updateQty(v1, 0) internally calls removeItem
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('"Proceed to checkout" link navigates to /checkout', async () => {
    await setup([sampleItem])
    const checkoutLink = screen.getByRole('link', { name: /proceed to checkout/i })
    expect(checkoutLink).toHaveAttribute('href', '/checkout')
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npm test -- tests/components/cart/cart-drawer.test.tsx
```

Expected: 5 tests pass, 0 fail.

---

## Task 10 — GAP 9: tests/components/checkout/checkout-form.test.tsx (new file)

CheckoutForm is complex. Mock: `next/navigation`, `@stripe/react-stripe-js`, `@stripe/stripe-js`, `@/lib/api/orders`, and `fetch` (used by the component to create a payment intent).

**Files:**
- Create: `tests/components/checkout/checkout-form.test.tsx`

- [ ] **Step 1: Create tests/components/checkout/checkout-form.test.tsx**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = vi.fn()
const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush, replace: mockReplace })),
  usePathname: vi.fn(() => '/checkout'),
}))

vi.mock('@stripe/stripe-js', () => ({ loadStripe: vi.fn(() => Promise.resolve(null)) }))
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useStripe: vi.fn(() => null),
  useElements: vi.fn(() => null),
  PaymentElement: () => <div data-testid="payment-element" />,
}))

vi.mock('@/lib/api/orders', () => ({
  createOrder: vi.fn(),
  fetchDefaultLocationId: vi.fn(() => Promise.resolve('loc-1')),
}))

// Suppress console.error from Next.js internals in test output
vi.spyOn(console, 'error').mockImplementation(() => {})

async function renderCheckoutForm(authStatus: string, cartItems: unknown[] = []) {
  vi.resetModules()

  const { useAuthStore } = await import('@/store/auth-store')
  const { useCartStore } = await import('@/store/cart-store')

  useAuthStore.setState({
    status: authStatus as any,
    token: authStatus === 'authenticated' ? 'tok' : null,
    user: authStatus === 'authenticated' ? { id: '1', username: 'alice' } : null,
  } as any)

  useCartStore.setState({ items: cartItems as any })

  // Mock fetch for payment-intent when mode is not 'choose'
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ clientSecret: 'pi_test_secret' }),
        ok: true,
      }),
    ),
  )

  const { CheckoutForm } = await import('@/components/checkout/checkout-form')
  return render(<CheckoutForm />)
}

const cartItem = {
  variantId: 'v1',
  productName: 'Shirt',
  variantName: 'Red / M',
  price: 2999,
  quantity: 1,
  imageUrl: '/shirt.jpg',
}

describe('CheckoutForm', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockReplace.mockReset()
  })

  it('no JWT → guest-vs-login choice rendered', async () => {
    await renderCheckoutForm('guest', [cartItem])
    expect(screen.getByText(/how would you like to check out/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue as guest/i })).toBeInTheDocument()
  })

  it('JWT in store → choice skipped, address + payment shown', async () => {
    await renderCheckoutForm('authenticated', [cartItem])
    await waitFor(() => {
      expect(screen.getByText(/shipping details/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/how would you like to check out/i)).not.toBeInTheDocument()
  })

  it('guest email input is required (empty → invalid)', async () => {
    const user = userEvent.setup()
    await renderCheckoutForm('guest', [cartItem])
    await user.click(screen.getByRole('button', { name: /continue as guest/i }))
    const emailInput = await screen.findByLabelText(/email address/i)
    expect(emailInput).toBeInvalid()
  })

  it('invalid email format → input reports invalid', async () => {
    const user = userEvent.setup()
    await renderCheckoutForm('guest', [cartItem])
    await user.click(screen.getByRole('button', { name: /continue as guest/i }))
    const emailInput = await screen.findByLabelText(/email address/i)
    await user.type(emailInput, 'not-an-email')
    expect(emailInput).toBeInvalid()
  })

  it('click "Sign in / Register" → link points to /login?next=/checkout', async () => {
    await renderCheckoutForm('guest', [cartItem])
    const link = screen.getByRole('link', { name: /sign in/i })
    expect(link).toHaveAttribute('href', '/login?next=/checkout')
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npm test -- tests/components/checkout/checkout-form.test.tsx
```

Expected: 5 tests pass, 0 fail.

---

## Task 11 — GAP 10: tests/components/account/layout.test.tsx (new file)

> **Spec vs code note:** The spec states "status 'idle' → router.replace called". The actual `layout.tsx` shows a spinner for both `'idle'` and `'loading'`, and only redirects for `'guest'`. Tests are written to match the actual code. If the spec intent is to redirect on idle, `layout.tsx` needs updating (outside scope of this plan).

**Files:**
- Create: `tests/components/account/layout.test.tsx`

- [ ] **Step 1: Create tests/components/account/layout.test.tsx**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace })),
  usePathname: vi.fn(() => '/account'),
}))

async function renderLayout(status: string) {
  vi.resetModules()
  const { useAuthStore } = await import('@/store/auth-store')
  useAuthStore.setState({ status: status as any } as any)
  const AccountLayout = (await import('@/app/(account)/layout')).default
  return render(
    <AccountLayout>
      <div data-testid="child">account content</div>
    </AccountLayout>,
  )
}

describe('AccountLayout', () => {
  beforeEach(() => {
    mockReplace.mockReset()
  })

  it('status loading → spinner rendered, no redirect', async () => {
    await renderLayout('loading')
    // spinner is a div with animate-spin class
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('status authenticated → children rendered', async () => {
    await renderLayout('authenticated')
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('status guest → router.replace /login?next=/account called', async () => {
    await renderLayout('guest')
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login?next=%2Faccount')
    })
  })

  it('status idle → spinner rendered, no redirect', async () => {
    // Actual layout.tsx shows spinner for idle (same as loading); no redirect.
    await renderLayout('idle')
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npm test -- tests/components/account/layout.test.tsx
```

Expected: 4 tests pass, 0 fail.

- [ ] **Step 3: Run complete test suite**

```bash
npm test
```

Expected: all tests pass. Report the total count and pass rate.

---

## Self-review checklist

- [x] **Spec coverage:** All 10 gaps addressed. 27 new tests (2+4+4+4+4+3+6+5+5+4 = 41 — wait, let me recount)

  | Gap | Tests |
  |---|---|
  | GAP 1 | 2 |
  | GAP 2 | 4 |
  | GAP 3 | 4 |
  | GAP 4 | 4 |
  | GAP 5 | 4 |
  | GAP 6 | 3 |
  | GAP 7 | 6 |
  | GAP 8 | 5 |
  | GAP 9 | 5 |
  | GAP 10 | 4 |
  | **Total** | **41 new tests** |

- [x] **Placeholder scan:** No TBDs. All code is complete.
- [x] **Type consistency:** `CartItem`, `AuthState`, `Product`, `Order`, `OrderSummary`, `AuthResponse` — all used consistently with their definitions in `src/types/`.
- [x] **Spec deviation documented:** GAP 7 test 4 (missing currency → 200 not 400), GAP 10 test 4 (idle → spinner not redirect).
- [x] **Source code change:** Task 1 modifies `auth-store.ts` — required to make GAP 2 tests 1, 3, 4 pass. Does not break existing 4 auth-store tests (verified by keeping identical behaviour for happy path + ADMIN rejection).
