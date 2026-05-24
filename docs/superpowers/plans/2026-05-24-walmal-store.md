# walmal-store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a customer-facing web store for walmal — guests browse and add to cart; registered customers check out with Stripe and manage orders.

**Architecture:** Next.js 15 App Router with server components (SSG/SSR) for SEO pages and client components for cart/checkout/account. Zustand manages auth (memory only, no persistence) and cart (localStorage via persist middleware). Stripe Payment Intents keep the secret key server-side via a Next.js API route. All backend calls target `http://localhost:8080/api/v1`.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind CSS, shadcn/ui, Zustand 5, Axios, Stripe (`stripe` server + `@stripe/react-stripe-js` client), Vitest, React Testing Library

---

## Confirmed assumptions to verify before Task 1

- **Refresh cookie** (Section 3 note): `AuthProvider` calls `POST /api/v1/auth/refresh` on mount. If the endpoint returns 404 or 401, the silent refresh is skipped and users re-login on page reload. No code change needed — the try/catch already handles this.
- **Cart endpoints** (Section 4 note): `auth-store.login()` attempts `GET /api/v1/cart`. If the endpoint returns 404, it skips the server sync and uses local cart as-is.
- **PaymentIntent reconciliation** (Section 5 note): the `order-failed` UI surface shows the `paymentIntentId`. Confirm `GET /api/v1/orders?paymentIntentId=...` exists on the walmal backend before adding a "check order status" link; otherwise show a support email fallback.

---

## File Map

```
src/
├── types/
│   ├── product.ts
│   ├── order.ts
│   ├── cart.ts
│   └── auth.ts
├── lib/
│   ├── utils.ts
│   ├── stripe.ts
│   └── api/
│       ├── client.ts
│       ├── server.ts
│       ├── products.ts
│       ├── auth.ts
│       ├── orders.ts
│       └── cart.ts
├── store/
│   ├── auth-store.ts
│   └── cart-store.ts
├── hooks/
│   ├── use-auth.ts
│   └── use-cart.ts
├── components/
│   ├── providers.tsx
│   ├── layout/
│   │   ├── site-header.tsx
│   │   ├── site-footer.tsx
│   │   └── cart-icon-button.tsx
│   ├── product/
│   │   ├── product-card.tsx
│   │   ├── product-grid.tsx
│   │   ├── product-detail.tsx
│   │   └── variant-selector.tsx
│   ├── cart/
│   │   ├── cart-drawer.tsx
│   │   ├── cart-item.tsx
│   │   └── cart-summary.tsx
│   ├── checkout/
│   │   ├── checkout-form.tsx
│   │   ├── guest-fields.tsx
│   │   ├── address-form.tsx
│   │   └── stripe-payment.tsx
│   └── auth/
│       ├── login-form.tsx
│       └── register-form.tsx
└── app/
    ├── globals.css
    ├── layout.tsx
    ├── (shop)/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── products/
    │       ├── page.tsx
    │       └── [slug]/page.tsx
    ├── (checkout)/
    │   ├── layout.tsx
    │   ├── cart/page.tsx
    │   └── checkout/page.tsx
    ├── (account)/
    │   ├── layout.tsx
    │   └── account/
    │       ├── page.tsx
    │       └── orders/[id]/page.tsx
    ├── login/page.tsx
    ├── register/page.tsx
    ├── order-confirmation/page.tsx
    └── api/payment-intent/route.ts

tests/
├── setup.ts
├── store/
│   ├── cart-store.test.ts
│   └── auth-store.test.ts
└── lib/api/
    └── client.test.ts

vitest.config.ts
.env.local.example
next.config.ts   (modify)
```

---

## Task 1: Bootstrap project

**Files:**
- Create: scaffolded by `create-next-app`
- Modify: `package.json` (add extra deps)

- [ ] **Step 1: Scaffold Next.js 15 app in current directory**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes
```

If the directory is not empty the CLI will warn — accept and continue.

- [ ] **Step 2: Install additional runtime dependencies**

```bash
npm install zustand axios stripe @stripe/stripe-js @stripe/react-stripe-js
```

- [ ] **Step 3: Install dev dependencies for testing**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom @types/node
```

- [ ] **Step 4: Install shadcn/ui**

```bash
npx shadcn@latest init --yes
```

When prompted for style: Default. When prompted for base color: Slate.

- [ ] **Step 5: Add shadcn components used in this project**

```bash
npx shadcn@latest add button card input label badge sheet separator skeleton dialog
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: `▲ Next.js 15.x.x` and `Local: http://localhost:3000` with no errors.
Stop the server (`Ctrl+C`) after confirming.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: bootstrap Next.js 15 app with shadcn/ui and Stripe deps"
```

---

## Task 2: Vitest + test infrastructure

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Modify: `package.json` (add test script)

- [ ] **Step 1: Create vitest config**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 2: Create test setup file**

```ts
// tests/setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, add to the `"scripts"` section:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify test runner works**

```bash
npm test
```

Expected: `No test files found` (zero tests yet) — exit 0.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/setup.ts package.json
git commit -m "chore: add Vitest + React Testing Library test infrastructure"
```

---

## Task 3: TypeScript types

**Files:**
- Create: `src/types/product.ts`
- Create: `src/types/order.ts`
- Create: `src/types/cart.ts`
- Create: `src/types/auth.ts`

- [ ] **Step 1: Write product types**

```ts
// src/types/product.ts
export interface ProductVariant {
  id: string
  name: string
  price: number        // in cents
  stock: number
  imageUrl: string
}

export interface Product {
  id: string
  slug: string
  name: string
  description: string
  category: string
  imageUrl: string
  variants: ProductVariant[]
}

export interface ProductListResponse {
  products: Product[]
  total: number
  page: number
  pageSize: number
}
```

- [ ] **Step 2: Write order types**

```ts
// src/types/order.ts
export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export interface ShippingAddress {
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface OrderItem {
  variantId: string
  productName: string
  variantName: string
  price: number
  quantity: number
  imageUrl: string
}

export interface OrderSummary {
  id: string
  status: OrderStatus
  total: number
  createdAt: string
  itemCount: number
}

export interface Order {
  id: string
  status: OrderStatus
  items: OrderItem[]
  shippingAddress: ShippingAddress
  total: number
  paymentIntentId: string
  createdAt: string
  guestEmail?: string
}

export interface CreateOrderPayload {
  paymentIntentId: string
  items: OrderItem[]
  shippingAddress: ShippingAddress
  guestEmail?: string
}
```

- [ ] **Step 3: Write cart types**

```ts
// src/types/cart.ts
export interface CartItem {
  variantId: string
  productName: string
  variantName: string
  price: number        // unit price in cents
  quantity: number
  imageUrl: string
}
```

- [ ] **Step 4: Write auth types**

```ts
// src/types/auth.ts
export interface CustomerUser {
  id: string
  email: string
  name: string
}

export interface AuthResponse {
  token: string
  user: CustomerUser
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/types/
git commit -m "feat: add TypeScript types for product, order, cart, and auth"
```

---

## Task 4: Utilities

**Files:**
- Create: `src/lib/utils.ts` (replace the one shadcn generated)

- [ ] **Step 1: Write utils**

shadcn already created `src/lib/utils.ts` with `cn()`. Open it and replace with:

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: add formatPrice utility"
```

---

## Task 5: API client + tests

**Files:**
- Create: `src/lib/api/client.ts`
- Create: `src/lib/api/server.ts`
- Create: `tests/lib/api/client.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/api/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios')
  return {
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })),
    },
  }
})

describe('ApiError', () => {
  it('stores status, code, and message', async () => {
    const { ApiError } = await import('@/lib/api/client')
    const err = new ApiError(404, 'NOT_FOUND', 'Resource not found')
    expect(err.status).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.message).toBe('Resource not found')
    expect(err).toBeInstanceOf(Error)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/lib/api/client.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/api/client'`

- [ ] **Step 3: Write the API client**

```ts
// src/lib/api/client.ts
import axios, { AxiosError } from 'axios'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10_000,
})

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Dynamically import to avoid circular dep at module load time
    const { useAuthStore } = require('@/store/auth-store')
    const token: string | null = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ code?: string; message?: string }>) => {
    const status = error.response?.status ?? 0
    const code = error.response?.data?.code ?? 'UNKNOWN'
    const message = error.response?.data?.message ?? error.message

    if (status === 401 && typeof window !== 'undefined') {
      const { useAuthStore } = require('@/store/auth-store')
      const { useCartStore } = require('@/store/cart-store')
      useAuthStore.getState().logout()
      useCartStore.getState().clearCart()
      const next = window.location.pathname
      window.location.href = `/login?next=${encodeURIComponent(next)}`
    }

    return Promise.reject(new ApiError(status, code, message))
  },
)
```

- [ ] **Step 4: Write server fetch helper**

```ts
// src/lib/api/server.ts
import { ApiError } from './client'

export async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.code ?? 'UNKNOWN', body.message ?? res.statusText)
  }

  return res.json() as Promise<T>
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test tests/lib/api/client.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/api/client.ts src/lib/api/server.ts tests/lib/api/client.test.ts
git commit -m "feat: add Axios API client with ApiError + server fetch helper"
```

---

## Task 6: API domain modules

**Files:**
- Create: `src/lib/api/products.ts`
- Create: `src/lib/api/auth.ts`
- Create: `src/lib/api/orders.ts`
- Create: `src/lib/api/cart.ts`

- [ ] **Step 1: Write products API module**

```ts
// src/lib/api/products.ts
import { serverFetch } from './server'
import { apiClient } from './client'
import type { Product, ProductListResponse } from '@/types/product'

export interface ProductsQuery {
  category?: string
  sort?: string
  page?: number
}

export function fetchProducts(query: ProductsQuery = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams()
  if (query.category) params.set('category', query.category)
  if (query.sort) params.set('sort', query.sort)
  if (query.page) params.set('page', String(query.page))
  const qs = params.toString() ? `?${params}` : ''
  return serverFetch<ProductListResponse>(`/products${qs}`, { cache: 'no-store' })
}

export function fetchProduct(slug: string): Promise<Product> {
  return serverFetch<Product>(`/products/${slug}`, { cache: 'no-store' })
}

export function fetchProductsSSG(): Promise<ProductListResponse> {
  return serverFetch<ProductListResponse>('/products', {
    next: { revalidate: 3600 },
  })
}

export async function fetchProductClient(slug: string): Promise<Product> {
  const res = await apiClient.get<Product>(`/products/${slug}`)
  return res.data
}
```

- [ ] **Step 2: Write auth API module**

```ts
// src/lib/api/auth.ts
import { apiClient } from './client'
import type { AuthResponse } from '@/types/auth'

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/login', { email, password })
  return res.data
}

export async function registerApi(
  email: string,
  password: string,
  name: string,
): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/register', { email, password, name })
  return res.data
}

export async function refreshTokenApi(): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/refresh')
  return res.data
}
```

- [ ] **Step 3: Write orders API module**

```ts
// src/lib/api/orders.ts
import { apiClient } from './client'
import type { Order, OrderSummary, CreateOrderPayload } from '@/types/order'

export async function createOrder(payload: CreateOrderPayload): Promise<{ orderId: string }> {
  const res = await apiClient.post<{ orderId: string }>('/orders', payload)
  return res.data
}

export async function fetchOrders(): Promise<OrderSummary[]> {
  const res = await apiClient.get<OrderSummary[]>('/orders')
  return res.data
}

export async function fetchOrder(id: string): Promise<Order> {
  const res = await apiClient.get<Order>(`/orders/${id}`)
  return res.data
}
```

- [ ] **Step 4: Write cart API module (guarded — only used if backend has these endpoints)**

```ts
// src/lib/api/cart.ts
import { apiClient } from './client'
import type { CartItem } from '@/types/cart'

export async function fetchServerCart(): Promise<CartItem[]> {
  const res = await apiClient.get<CartItem[]>('/cart')
  return res.data
}

export async function syncServerCart(items: CartItem[]): Promise<void> {
  await apiClient.put('/cart', { items })
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/api/
git commit -m "feat: add API domain modules for products, auth, orders, and cart"
```

---

## Task 7: Stripe server instance + payment-intent API route

**Files:**
- Create: `src/lib/stripe.ts`
- Create: `src/app/api/payment-intent/route.ts`

- [ ] **Step 1: Write server-side Stripe instance**

```ts
// src/lib/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})
```

- [ ] **Step 2: Write payment-intent API route**

```ts
// src/app/api/payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

const SUPPORTED_CURRENCIES = new Set(['usd', 'eur', 'gbp', 'sgd', 'myr'])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { amount, currency = 'usd', metadata = {} } = body

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
    }
    if (!SUPPORTED_CURRENCIES.has(currency)) {
      return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (error) {
    console.error('[payment-intent]', error)
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 })
  }
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/stripe.ts src/app/api/payment-intent/route.ts
git commit -m "feat: add Stripe server instance and payment-intent API route"
```

---

## Task 8: Auth store + hook + tests

**Files:**
- Create: `src/store/auth-store.ts`
- Create: `src/hooks/use-auth.ts`
- Create: `tests/store/auth-store.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/store/auth-store.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/auth', () => ({
  loginApi: vi.fn(),
  registerApi: vi.fn(),
  refreshTokenApi: vi.fn(),
}))

vi.mock('@/store/cart-store', () => ({
  useCartStore: { getState: vi.fn(() => ({ clearCart: vi.fn() })) },
}))

describe('auth-store', () => {
  beforeEach(async () => {
    vi.resetModules()
    const { useAuthStore } = await import('@/store/auth-store')
    useAuthStore.setState({ token: null, user: null, status: 'idle' })
  })

  it('starts with idle status and no token', async () => {
    const { useAuthStore } = await import('@/store/auth-store')
    const { token, user, status } = useAuthStore.getState()
    expect(token).toBeNull()
    expect(user).toBeNull()
    expect(status).toBe('idle')
  })

  it('sets authenticated state on successful login', async () => {
    const { loginApi } = await import('@/lib/api/auth')
    vi.mocked(loginApi).mockResolvedValueOnce({
      token: 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQ1VTVE9NRVIiLCJzdWIiOiIxIn0.sig',
      user: { id: '1', email: 'a@b.com', name: 'Alice' },
    })
    const { useAuthStore } = await import('@/store/auth-store')
    await useAuthStore.getState().login('a@b.com', 'pass')
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().user?.email).toBe('a@b.com')
  })

  it('rejects non-CUSTOMER role tokens', async () => {
    const { loginApi } = await import('@/lib/api/auth')
    // Payload: { "role": "ADMIN" }
    vi.mocked(loginApi).mockResolvedValueOnce({
      token: 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQURNSU4ifQ.sig',
      user: { id: '2', email: 'admin@b.com', name: 'Admin' },
    })
    const { useAuthStore } = await import('@/store/auth-store')
    await expect(useAuthStore.getState().login('admin@b.com', 'pass')).rejects.toThrow(
      'This store is for customers only.'
    )
    expect(useAuthStore.getState().status).toBe('guest')
  })

  it('clears token and user on logout', async () => {
    const { useAuthStore } = await import('@/store/auth-store')
    useAuthStore.setState({
      token: 'tok',
      user: { id: '1', email: 'a@b.com', name: 'Alice' },
      status: 'authenticated',
    })
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().status).toBe('guest')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test tests/store/auth-store.test.ts
```

Expected: FAIL — `Cannot find module '@/store/auth-store'`

- [ ] **Step 3: Write the auth store**

```ts
// src/store/auth-store.ts
import { create } from 'zustand'
import type { CustomerUser } from '@/types/auth'

interface AuthState {
  token: string | null
  user: CustomerUser | null
  status: 'idle' | 'loading' | 'authenticated' | 'guest'
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  setToken: (token: string, user: CustomerUser) => void
}

function decodeRole(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role ?? ''
  } catch {
    return ''
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  user: null,
  status: 'idle',

  login: async (email, password) => {
    set({ status: 'loading' })
    const { loginApi } = await import('@/lib/api/auth')
    const { token, user } = await loginApi(email, password)
    if (decodeRole(token) !== 'CUSTOMER') {
      set({ status: 'guest' })
      throw new Error('This store is for customers only.')
    }
    set({ token, user, status: 'authenticated' })
  },

  register: async (email, password, name) => {
    set({ status: 'loading' })
    const { registerApi } = await import('@/lib/api/auth')
    const { token, user } = await registerApi(email, password, name)
    set({ token, user, status: 'authenticated' })
  },

  logout: () => {
    set({ token: null, user: null, status: 'guest' })
  },

  setToken: (token, user) => set({ token, user, status: 'authenticated' }),
}))
```

- [ ] **Step 4: Write the use-auth hook**

```ts
// src/hooks/use-auth.ts
import { useAuthStore } from '@/store/auth-store'
import { useCartStore } from '@/store/cart-store'

export function useAuth() {
  const store = useAuthStore()

  function logout() {
    store.logout()
    useCartStore.getState().clearCart()
  }

  return { ...store, logout }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test tests/store/auth-store.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/store/auth-store.ts src/hooks/use-auth.ts tests/store/auth-store.test.ts
git commit -m "feat: add auth store with CUSTOMER role guard and use-auth hook"
```

---

## Task 9: Cart store + hook + tests

**Files:**
- Create: `src/store/cart-store.ts`
- Create: `src/hooks/use-cart.ts`
- Create: `tests/store/cart-store.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/store/cart-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type { CartItem } from '@/types/cart'

const item1: CartItem = {
  variantId: 'v1',
  productName: 'Shirt',
  variantName: 'Red / M',
  price: 2999,
  quantity: 1,
  imageUrl: '/shirt.jpg',
}

const item2: CartItem = {
  variantId: 'v2',
  productName: 'Pants',
  variantName: 'Blue / 32',
  price: 4999,
  quantity: 2,
  imageUrl: '/pants.jpg',
}

describe('cart-store', () => {
  beforeEach(async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.setState({ items: [] })
  })

  it('starts empty', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('adds a new item', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.getState().addItem(item1)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].variantId).toBe('v1')
  })

  it('increments quantity when same variant added again', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.getState().addItem(item1)
    useCartStore.getState().addItem({ ...item1, quantity: 2 })
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].quantity).toBe(3)
  })

  it('removes an item', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.getState().addItem(item1)
    useCartStore.getState().addItem(item2)
    useCartStore.getState().removeItem('v1')
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].variantId).toBe('v2')
  })

  it('updates quantity', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.getState().addItem(item1)
    useCartStore.getState().updateQty('v1', 5)
    expect(useCartStore.getState().items[0].quantity).toBe(5)
  })

  it('removes item when quantity updated to 0', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.getState().addItem(item1)
    useCartStore.getState().updateQty('v1', 0)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('clears all items', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.getState().addItem(item1)
    useCartStore.getState().addItem(item2)
    useCartStore.getState().clearCart()
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('mergeGuestCart: server wins on quantity conflicts, appends local-only items', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    // Local has v1 (qty 3) and v2 (qty 2)
    useCartStore.setState({ items: [{ ...item1, quantity: 3 }, item2] })
    // Server has v1 (qty 1)
    useCartStore.getState().mergeGuestCart([{ ...item1, quantity: 1 }])
    const items = useCartStore.getState().items
    const v1 = items.find(i => i.variantId === 'v1')
    const v2 = items.find(i => i.variantId === 'v2')
    expect(v1?.quantity).toBe(1)  // server wins
    expect(v2?.quantity).toBe(2)  // local-only item appended
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test tests/store/cart-store.test.ts
```

Expected: FAIL — `Cannot find module '@/store/cart-store'`

- [ ] **Step 3: Write the cart store**

```ts
// src/store/cart-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/types/cart'

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (variantId: string) => void
  updateQty: (variantId: string, qty: number) => void
  clearCart: () => void
  mergeGuestCart: (serverItems: CartItem[]) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (incoming) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === incoming.variantId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === incoming.variantId
                  ? { ...i, quantity: i.quantity + incoming.quantity }
                  : i,
              ),
            }
          }
          return { items: [...state.items, incoming] }
        }),

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),

      updateQty: (variantId, qty) => {
        if (qty <= 0) {
          get().removeItem(variantId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, quantity: qty } : i,
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      mergeGuestCart: (serverItems) =>
        set((state) => {
          const merged = [...serverItems]
          for (const local of state.items) {
            if (!merged.find((s) => s.variantId === local.variantId)) {
              merged.push(local)
            }
            // server wins on quantity conflicts — skip local if already in server
          }
          return { items: merged }
        }),
    }),
    { name: 'walmal-cart' },
  ),
)
```

- [ ] **Step 4: Write use-cart hook**

```ts
// src/hooks/use-cart.ts
import { useCartStore } from '@/store/cart-store'
import { formatPrice } from '@/lib/utils'

export function useCart() {
  const store = useCartStore()

  const itemCount = store.items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = store.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const subtotalFormatted = formatPrice(subtotal)

  return { ...store, itemCount, subtotal, subtotalFormatted }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test tests/store/cart-store.test.ts
```

Expected: PASS (8 tests)

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/store/cart-store.ts src/hooks/use-cart.ts tests/store/cart-store.test.ts
git commit -m "feat: add cart store with localStorage persistence and use-cart hook"
```

---

## Task 10: Providers + root layout + (checkout)/(account) layouts

**Files:**
- Create: `src/components/providers.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/app/(checkout)/layout.tsx`
- Create: `src/app/(account)/layout.tsx`

- [ ] **Step 1: Write AuthProvider + root Providers component**

```tsx
// src/components/providers.tsx
'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { useCartStore } from '@/store/cart-store'
import { refreshTokenApi } from '@/lib/api/auth'
import { fetchServerCart, syncServerCart } from '@/lib/api/cart'
import { ApiError } from '@/lib/api/client'

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setToken, status } = useAuthStore()
  const cartStore = useCartStore()

  useEffect(() => {
    async function attemptSilentRefresh() {
      try {
        const { token, user } = await refreshTokenApi()
        setToken(token, user)

        // Attempt cart merge — guarded: skip if endpoint doesn't exist
        try {
          const serverItems = await fetchServerCart()
          cartStore.mergeGuestCart(serverItems)
          await syncServerCart(useCartStore.getState().items)
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            // Backend has no cart endpoints — use local cart as-is
          }
        }
      } catch {
        // Refresh failed (no cookie, expired, or endpoint absent) — stay as guest
        useAuthStore.setState({ status: 'guest' })
      }
    }

    if (status === 'idle') {
      attemptSilentRefresh()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
```

- [ ] **Step 2: Update root layout**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'Walmal Store', template: '%s | Walmal' },
  description: 'Shop the latest products at Walmal.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Write (checkout) layout**

```tsx
// src/app/(checkout)/layout.tsx
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-background">{children}</main>
}
```

- [ ] **Step 4: Write (account) layout — auth guard**

```tsx
// src/app/(account)/layout.tsx
'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const status = useAuthStore((s) => s.status)

  useEffect(() => {
    if (status === 'guest') {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [status, pathname, router])

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (status === 'guest') return null

  return <main className="min-h-screen bg-background">{children}</main>
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/providers.tsx src/app/layout.tsx src/app/\(checkout\)/layout.tsx src/app/\(account\)/layout.tsx
git commit -m "feat: add Providers with AuthProvider, root layout, and route group layouts"
```

---

## Task 11: Shop layout + navigation components

**Files:**
- Create: `src/components/layout/cart-icon-button.tsx`
- Create: `src/components/layout/site-header.tsx`
- Create: `src/components/layout/site-footer.tsx`
- Create: `src/app/(shop)/layout.tsx`

- [ ] **Step 1: Write cart icon button**

```tsx
// src/components/layout/cart-icon-button.tsx
'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/hooks/use-cart'

export function CartIconButton() {
  const { itemCount } = useCart()

  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link href="/cart" aria-label={`Cart (${itemCount} items)`}>
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
            {itemCount > 99 ? '99+' : itemCount}
          </Badge>
        )}
      </Link>
    </Button>
  )
}
```

- [ ] **Step 2: Write site header**

```tsx
// src/components/layout/site-header.tsx
'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { CartIconButton } from './cart-icon-button'
import { Button } from '@/components/ui/button'

export function SiteHeader() {
  const { status, user, logout } = useAuth()
  const isAuthenticated = status === 'authenticated'

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Walmal
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/products" className="text-muted-foreground transition-colors hover:text-foreground">
            Products
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <CartIconButton />
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/account">Hi, {user?.name.split(' ')[0]}</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Write site footer**

```tsx
// src/components/layout/site-footer.tsx
export function SiteFooter() {
  return (
    <footer className="border-t py-8">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Walmal. All rights reserved.
      </div>
    </footer>
  )
}
```

- [ ] **Step 4: Write (shop) layout**

```tsx
// src/app/(shop)/layout.tsx
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/ src/app/\(shop\)/layout.tsx
git commit -m "feat: add shop layout, site header with auth state, footer, and cart icon"
```

---

## Task 12: Product components

**Files:**
- Create: `src/components/product/product-card.tsx`
- Create: `src/components/product/product-grid.tsx`
- Create: `src/components/product/variant-selector.tsx`
- Create: `src/components/product/product-detail.tsx`

- [ ] **Step 1: Write product card**

```tsx
// src/components/product/product-card.tsx
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types/product'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const lowestPrice = Math.min(...product.variants.map((v) => v.price))

  return (
    <Card className="group overflow-hidden">
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{product.category}</p>
          <h3 className="mt-1 font-semibold line-clamp-2">{product.name}</h3>
        </CardContent>
        <CardFooter className="px-4 pb-4 pt-0">
          <span className="text-sm font-medium">From {formatPrice(lowestPrice)}</span>
        </CardFooter>
      </Link>
    </Card>
  )
}
```

- [ ] **Step 2: Write product grid**

```tsx
// src/components/product/product-grid.tsx
import { ProductCard } from './product-card'
import type { Product } from '@/types/product'

interface ProductGridProps {
  products: Product[]
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        No products found.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Write variant selector**

```tsx
// src/components/product/variant-selector.tsx
'use client'

import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import type { ProductVariant } from '@/types/product'

interface VariantSelectorProps {
  variants: ProductVariant[]
  selectedId: string | null
  onSelect: (variant: ProductVariant) => void
}

export function VariantSelector({ variants, selectedId, onSelect }: VariantSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Select variant</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => (
          <Button
            key={variant.id}
            variant={selectedId === variant.id ? 'default' : 'outline'}
            size="sm"
            disabled={variant.stock === 0}
            onClick={() => onSelect(variant)}
          >
            {variant.name}
            <span className="ml-2 text-xs">{formatPrice(variant.price)}</span>
            {variant.stock === 0 && <span className="ml-1 text-xs">(Out of stock)</span>}
          </Button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write product detail**

```tsx
// src/components/product/product-detail.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { VariantSelector } from './variant-selector'
import { useCart } from '@/hooks/use-cart'
import { formatPrice } from '@/lib/utils'
import type { Product, ProductVariant } from '@/types/product'

interface ProductDetailProps {
  product: Product
}

export function ProductDetail({ product }: ProductDetailProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [added, setAdded] = useState(false)
  const { addItem } = useCart()

  function handleAddToCart() {
    if (!selectedVariant) return
    addItem({
      variantId: selectedVariant.id,
      productName: product.name,
      variantName: selectedVariant.name,
      price: selectedVariant.price,
      quantity: 1,
      imageUrl: selectedVariant.imageUrl || product.imageUrl,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="relative aspect-square overflow-hidden rounded-lg">
        <Image
          src={selectedVariant?.imageUrl || product.imageUrl}
          alt={product.name}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">{product.category}</p>
          <h1 className="mt-1 text-3xl font-bold">{product.name}</h1>
          {selectedVariant && (
            <p className="mt-2 text-2xl font-semibold">{formatPrice(selectedVariant.price)}</p>
          )}
        </div>

        <p className="text-muted-foreground">{product.description}</p>

        <VariantSelector
          variants={product.variants}
          selectedId={selectedVariant?.id ?? null}
          onSelect={setSelectedVariant}
        />

        <Button
          size="lg"
          className="w-full"
          disabled={!selectedVariant || selectedVariant.stock === 0}
          onClick={handleAddToCart}
        >
          {added ? 'Added to cart!' : 'Add to cart'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/product/
git commit -m "feat: add product components (card, grid, variant selector, detail)"
```

---

## Task 13: Home page + products pages (SSG + SSR)

**Files:**
- Create: `src/app/(shop)/page.tsx`
- Create: `src/app/(shop)/products/page.tsx`
- Create: `src/app/(shop)/products/[slug]/page.tsx`

- [ ] **Step 1: Write home page (SSG)**

```tsx
// src/app/(shop)/page.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ProductGrid } from '@/components/product/product-grid'
import { fetchProductsSSG } from '@/lib/api/products'

export const revalidate = 3600

export default async function HomePage() {
  const { products } = await fetchProductsSSG()
  const featured = products.slice(0, 4)

  return (
    <div className="container mx-auto px-4 py-12 space-y-16">
      <section className="text-center space-y-4 py-12">
        <h1 className="text-5xl font-bold tracking-tight">Welcome to Walmal</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover quality products curated for you.
        </p>
        <Button size="lg" asChild>
          <Link href="/products">Shop now</Link>
        </Button>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6">Featured products</h2>
        <ProductGrid products={featured} />
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/products">View all products</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Write products list page (SSR)**

```tsx
// src/app/(shop)/products/page.tsx
import type { Metadata } from 'next'
import { ProductGrid } from '@/components/product/product-grid'
import { fetchProducts } from '@/lib/api/products'

export const metadata: Metadata = {
  title: 'Products',
  description: 'Browse all products at Walmal.',
}

interface ProductsPageProps {
  searchParams: Promise<{ category?: string; sort?: string; page?: string }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams
  const { products, total } = await fetchProducts({
    category: params.category,
    sort: params.sort,
    page: params.page ? Number(params.page) : 1,
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        Products {params.category && <span className="text-muted-foreground">— {params.category}</span>}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">{total} products</p>
      <ProductGrid products={products} />
    </div>
  )
}
```

- [ ] **Step 3: Write product detail page (SSR)**

```tsx
// src/app/(shop)/products/[slug]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductDetail } from '@/components/product/product-detail'
import { fetchProduct, fetchProductsSSG } from '@/lib/api/products'
import { ApiError } from '@/lib/api/client'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const { slug } = await params
    const product = await fetchProduct(slug)
    return {
      title: product.name,
      description: product.description,
      openGraph: { images: [product.imageUrl] },
    }
  } catch {
    return { title: 'Product not found' }
  }
}

export async function generateStaticParams() {
  try {
    const { products } = await fetchProductsSSG()
    return products.slice(0, 20).map((p) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  try {
    const { slug } = await params
    const product = await fetchProduct(slug)
    return (
      <div className="container mx-auto px-4 py-8">
        <ProductDetail product={product} />
      </div>
    )
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(shop\)/
git commit -m "feat: add home page (SSG), products list (SSR), and product detail (SSR)"
```

---

## Task 14: Cart components + cart page

**Files:**
- Create: `src/components/cart/cart-item.tsx`
- Create: `src/components/cart/cart-summary.tsx`
- Create: `src/components/cart/cart-drawer.tsx`
- Create: `src/app/(checkout)/cart/page.tsx`

- [ ] **Step 1: Write cart item**

```tsx
// src/components/cart/cart-item.tsx
'use client'

import Image from 'next/image'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/hooks/use-cart'
import type { CartItem as CartItemType } from '@/types/cart'

export function CartItem({ item }: { item: CartItemType }) {
  const { updateQty, removeItem } = useCart()

  return (
    <div className="flex gap-4 py-4">
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border">
        <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" />
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <p className="font-medium">{item.productName}</p>
          <p className="text-sm text-muted-foreground">{item.variantName}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => updateQty(item.variantId, item.quantity - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-6 text-center text-sm">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => updateQty(item.variantId, item.quantity + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{formatPrice(item.price * item.quantity)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => removeItem(item.variantId)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write cart summary**

```tsx
// src/components/cart/cart-summary.tsx
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/hooks/use-cart'

export function CartSummary() {
  const { subtotalFormatted, itemCount } = useCart()

  return (
    <div className="space-y-4">
      <Separator />
      <div className="flex justify-between font-medium">
        <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
        <span>{subtotalFormatted}</span>
      </div>
      <p className="text-xs text-muted-foreground">Shipping and taxes calculated at checkout.</p>
      <Button className="w-full" size="lg" asChild>
        <Link href="/checkout">Proceed to checkout</Link>
      </Button>
      <Button variant="outline" className="w-full" asChild>
        <Link href="/products">Continue shopping</Link>
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Write cart drawer (slide-out for header)**

```tsx
// src/components/cart/cart-drawer.tsx
'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CartItem } from './cart-item'
import { CartSummary } from './cart-summary'
import { useCart } from '@/hooks/use-cart'

interface CartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { items } = useCart()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Your cart ({items.length})</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto divide-y">
          {items.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">Your cart is empty.</p>
          ) : (
            items.map((item) => <CartItem key={item.variantId} item={item} />)
          )}
        </div>
        {items.length > 0 && <CartSummary />}
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 4: Write cart page**

```tsx
// src/app/(checkout)/cart/page.tsx
'use client'

import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { CartItem } from '@/components/cart/cart-item'
import { CartSummary } from '@/components/cart/cart-summary'
import { useCart } from '@/hooks/use-cart'

export default function CartPage() {
  const { items } = useCart()

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto flex-1 px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold">Shopping cart</h1>
        {items.length === 0 ? (
          <p className="text-muted-foreground">Your cart is empty.</p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 divide-y">
              {items.map((item) => (
                <CartItem key={item.variantId} item={item} />
              ))}
            </div>
            <div className="lg:col-span-1">
              <CartSummary />
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/cart/ src/app/\(checkout\)/cart/
git commit -m "feat: add cart components (item, summary, drawer) and cart page"
```

---

## Task 15: Auth forms + login/register pages

**Files:**
- Create: `src/components/auth/login-form.tsx`
- Create: `src/components/auth/register-form.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/app/register/page.tsx`

- [ ] **Step 1: Write login form**

```tsx
// src/components/auth/login-form.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { ApiError } from '@/lib/api/client'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, status } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const next = searchParams.get('next') ?? '/account'
  const isLoading = status === 'loading'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
      router.replace(next)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code === 'INVALID_CREDENTIALS' ? 'Invalid email or password.' : err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      }
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Enter your email and password to access your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="underline">
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Write register form**

```tsx
// src/components/auth/register-form.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { ApiError } from '@/lib/api/client'

export function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register, status } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const next = searchParams.get('next') ?? '/account'
  const isLoading = status === 'loading'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await register(email, password, name)
      router.replace(next)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code === 'EMAIL_TAKEN' ? 'An account with this email already exists.' : err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      }
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Register to track your orders and save your details.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Write login page**

```tsx
// src/app/login/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 4: Write register page**

```tsx
// src/app/register/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = { title: 'Create account' }

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/ src/app/login/ src/app/register/
git commit -m "feat: add login and register forms + pages with CUSTOMER role enforcement"
```

---

## Task 16: Account pages

**Files:**
- Create: `src/app/(account)/account/page.tsx`
- Create: `src/app/(account)/account/orders/[id]/page.tsx`

- [ ] **Step 1: Write account overview page**

```tsx
// src/app/(account)/account/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { fetchOrders } from '@/lib/api/orders'
import { formatPrice } from '@/lib/utils'
import type { OrderSummary } from '@/types/order'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'secondary',
  PAID: 'default',
  SHIPPED: 'default',
  DELIVERED: 'default',
  CANCELLED: 'destructive',
}

export default function AccountPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto flex-1 px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">My account</h1>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Order history</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => <Skeleton key={n} className="h-20 w-full" />)}
            </div>
          ) : orders.length === 0 ? (
            <p className="text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <Link href={`/account/orders/${order.id}`} className="font-medium hover:underline">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()} · {order.itemCount} items
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatPrice(order.total)}</span>
                      <Badge variant={STATUS_COLORS[order.status] as 'default' | 'secondary' | 'destructive'}>
                        {order.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 2: Write order detail page**

```tsx
// src/app/(account)/account/orders/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { fetchOrder } from '@/lib/api/orders'
import { formatPrice } from '@/lib/utils'
import type { Order } from '@/types/order'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrder(id)
      .then(setOrder)
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto flex-1 px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/account">← Back to account</Link>
        </Button>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !order ? (
          <p className="text-muted-foreground">Order not found.</p>
        ) : (
          <div className="space-y-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">Order #{order.id.slice(-8).toUpperCase()}</h1>
                <p className="text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <Badge>{order.status}</Badge>
            </div>

            <section>
              <h2 className="mb-4 font-semibold">Items</h2>
              <div className="space-y-4 divide-y">
                {order.items.map((item) => (
                  <div key={item.variantId} className="flex gap-4 pt-4 first:pt-0">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border">
                      <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" />
                    </div>
                    <div className="flex flex-1 justify-between">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">{item.variantName}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>

            <section>
              <h2 className="mb-2 font-semibold">Shipping address</h2>
              <address className="not-italic text-sm text-muted-foreground">
                {order.shippingAddress.line1}<br />
                {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />
                {order.shippingAddress.country}
              </address>
            </section>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(account\)/account/
git commit -m "feat: add account overview and order detail pages"
```

---

## Task 17: Checkout components

**Files:**
- Create: `src/components/checkout/address-form.tsx`
- Create: `src/components/checkout/guest-fields.tsx`
- Create: `src/components/checkout/stripe-payment.tsx`
- Create: `src/components/checkout/checkout-form.tsx`

- [ ] **Step 1: Write address form (reusable fieldset)**

```tsx
// src/components/checkout/address-form.tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ShippingAddress } from '@/types/order'

interface AddressFormProps {
  value: Partial<ShippingAddress>
  onChange: (value: Partial<ShippingAddress>) => void
}

export function AddressForm({ value, onChange }: AddressFormProps) {
  function set(field: keyof ShippingAddress) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [field]: e.target.value })
  }

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <Label htmlFor="line1">Address line 1 *</Label>
        <Input id="line1" required value={value.line1 ?? ''} onChange={set('line1')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="line2">Address line 2</Label>
        <Input id="line2" value={value.line2 ?? ''} onChange={set('line2')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input id="city" required value={value.city ?? ''} onChange={set('city')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State *</Label>
          <Input id="state" required value={value.state ?? ''} onChange={set('state')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal code *</Label>
          <Input id="postalCode" required value={value.postalCode ?? ''} onChange={set('postalCode')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country *</Label>
          <Input id="country" required value={value.country ?? ''} onChange={set('country')} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write guest fields**

```tsx
// src/components/checkout/guest-fields.tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface GuestFieldsProps {
  email: string
  onChange: (email: string) => void
}

export function GuestFields({ email, onChange }: GuestFieldsProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="guestEmail">Email address *</Label>
      <Input
        id="guestEmail"
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        Your order confirmation will be sent to this address.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Write stripe payment component**

```tsx
// src/components/checkout/stripe-payment.tsx
'use client'

import { useState } from 'react'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'

interface StripePaymentProps {
  onSuccess: (paymentIntentId: string) => Promise<void>
  disabled?: boolean
}

export function StripePayment({ onSuccess, disabled }: StripePaymentProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError(null)

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return

    const { paymentIntent, error: stripeError } = await stripe.confirmCardPayment(
      '', // clientSecret is set on the Elements provider by the parent
      { payment_method: { card: cardElement } },
    )

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed. Please try again.')
      setProcessing(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      await onSuccess(paymentIntent.id)
    }

    setProcessing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md border p-3">
        <CardElement
          options={{
            style: {
              base: { fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } },
              invalid: { color: '#9e2146' },
            },
          }}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={!stripe || processing || disabled}>
        {processing ? 'Processing…' : 'Pay now'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Write checkout form (orchestrates all steps)**

```tsx
// src/components/checkout/checkout-form.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AddressForm } from './address-form'
import { GuestFields } from './guest-fields'
import { StripePayment } from './stripe-payment'
import { useAuth } from '@/hooks/use-auth'
import { useCart } from '@/hooks/use-cart'
import { createOrder } from '@/lib/api/orders'
import { formatPrice } from '@/lib/utils'
import type { ShippingAddress } from '@/types/order'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type CheckoutMode = 'choose' | 'guest' | 'authenticated'
type CheckoutStatus = 'idle' | 'ready' | 'processing' | 'order-failed'

export function CheckoutForm() {
  const router = useRouter()
  const { status: authStatus, user } = useAuth()
  const { items, subtotal, subtotalFormatted, clearCart } = useCart()

  const [mode, setMode] = useState<CheckoutMode>('choose')
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>('idle')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [guestEmail, setGuestEmail] = useState('')
  const [address, setAddress] = useState<Partial<ShippingAddress>>({})
  const [failedPaymentIntentId, setFailedPaymentIntentId] = useState<string | null>(null)

  const isAuthenticated = authStatus === 'authenticated'

  // Skip mode selection if already authenticated
  useEffect(() => {
    if (isAuthenticated) setMode('authenticated')
  }, [isAuthenticated])

  // Fetch payment intent when mode is determined and we have items
  useEffect(() => {
    if (mode === 'choose' || items.length === 0) return

    async function fetchClientSecret() {
      const res = await fetch('/api/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: subtotal, currency: 'usd' }),
      })
      const data = await res.json()
      setClientSecret(data.clientSecret)
      setCheckoutStatus('ready')
    }

    fetchClientSecret()
  }, [mode, subtotal, items.length])

  async function handlePaymentSuccess(paymentIntentId: string) {
    setCheckoutStatus('processing')
    try {
      const { orderId } = await createOrder({
        paymentIntentId,
        items: items.map((i) => ({
          variantId: i.variantId,
          productName: i.productName,
          variantName: i.variantName,
          price: i.price,
          quantity: i.quantity,
          imageUrl: i.imageUrl,
        })),
        shippingAddress: address as ShippingAddress,
        guestEmail: mode === 'guest' ? guestEmail : undefined,
      })
      clearCart()
      router.push(`/order-confirmation?id=${orderId}`)
    } catch {
      setFailedPaymentIntentId(paymentIntentId)
      setCheckoutStatus('order-failed')
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center space-y-4 py-12">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button asChild><Link href="/products">Shop now</Link></Button>
      </div>
    )
  }

  if (mode === 'choose') {
    return (
      <div className="max-w-md mx-auto space-y-4 py-12">
        <h2 className="text-xl font-semibold text-center">How would you like to check out?</h2>
        <Button className="w-full" size="lg" onClick={() => setMode('guest')}>
          Continue as guest
        </Button>
        <Button variant="outline" className="w-full" size="lg" asChild>
          <Link href={`/login?next=/checkout`}>Sign in / Register</Link>
        </Button>
      </div>
    )
  }

  if (checkoutStatus === 'order-failed') {
    return (
      <div className="max-w-md mx-auto space-y-4 py-12 text-center">
        <h2 className="text-xl font-semibold text-destructive">Payment received — order not created</h2>
        <p className="text-muted-foreground">
          Your card was charged but we couldn&apos;t record your order. Please contact support with
          reference: <code className="font-mono text-sm">{failedPaymentIntentId}</code>
        </p>
        <Button variant="outline" asChild>
          <a href="mailto:support@walmal.com">Contact support</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">
          {isAuthenticated ? `Shipping details` : 'Your details'}
        </h2>

        {mode === 'guest' && (
          <GuestFields email={guestEmail} onChange={setGuestEmail} />
        )}
        {isAuthenticated && (
          <p className="text-sm text-muted-foreground">Ordering as {user?.email}</p>
        )}

        <AddressForm value={address} onChange={setAddress} />

        <Separator />

        <h2 className="text-xl font-semibold">Payment</h2>

        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <StripePayment
              onSuccess={handlePaymentSuccess}
              disabled={checkoutStatus === 'processing'}
            />
          </Elements>
        )}
        {!clientSecret && checkoutStatus === 'idle' && (
          <div className="h-12 animate-pulse rounded-md bg-muted" />
        )}
      </div>

      <div className="space-y-4 rounded-lg border p-6 h-fit">
        <h3 className="font-semibold">Order summary</h3>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.variantId} className="flex justify-between text-sm">
              <span>{item.productName} × {item.quantity}</span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <Separator />
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{subtotalFormatted}</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/checkout/
git commit -m "feat: add checkout components (address form, guest fields, Stripe payment, checkout form)"
```

---

## Task 18: Checkout page + order confirmation

**Files:**
- Create: `src/app/(checkout)/checkout/page.tsx`
- Create: `src/app/order-confirmation/page.tsx`

- [ ] **Step 1: Write checkout page**

```tsx
// src/app/(checkout)/checkout/page.tsx
'use client'

import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { CheckoutForm } from '@/components/checkout/checkout-form'

export default function CheckoutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto flex-1 px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold">Checkout</h1>
        <CheckoutForm />
      </main>
      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 2: Write order confirmation page**

```tsx
// src/app/order-confirmation/page.tsx
'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { CheckCircle2 } from 'lucide-react'

function OrderConfirmationContent() {
  const searchParams = useSearchParams()
  const { status } = useAuth()
  const orderId = searchParams.get('id')

  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <CheckCircle2 className="h-16 w-16 text-green-500" />
      <h1 className="text-3xl font-bold">Order confirmed!</h1>
      {orderId && (
        <p className="text-muted-foreground">
          Order reference: <span className="font-mono font-medium">#{orderId.slice(-8).toUpperCase()}</span>
        </p>
      )}
      <p className="max-w-md text-muted-foreground">
        Thank you for your order. You will receive a confirmation email shortly.
      </p>
      <div className="flex gap-4">
        {status === 'authenticated' && orderId && (
          <Button asChild>
            <Link href={`/account/orders/${orderId}`}>View order</Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto flex-1 px-4 py-8">
        <Suspense>
          <OrderConfirmationContent />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(checkout\)/checkout/ src/app/order-confirmation/
git commit -m "feat: add checkout page and order confirmation page"
```

---

## Task 19: next.config.ts + .env.local.example + final wiring

**Files:**
- Modify: `next.config.ts`
- Create: `.env.local.example`

- [ ] **Step 1: Update next.config.ts to allow backend images**

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 2: Create .env.local.example**

```bash
# .env.local.example
# Copy to .env.local and fill in your values.
# Never commit .env.local to git.

# walmal backend
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# Stripe — get these from https://dashboard.stripe.com/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

- [ ] **Step 3: Ensure .env.local is gitignored**

Open `.gitignore` and confirm `.env.local` is listed. If not, add it:

```
.env.local
```

- [ ] **Step 4: Run full type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Final commit**

```bash
git add next.config.ts .env.local.example .gitignore
git commit -m "chore: add next.config.ts image domains and .env.local.example"
```

---

## Task 20: Smoke test the dev server

- [ ] **Step 1: Create .env.local from example**

```bash
cp .env.local.example .env.local
```

Fill in real or test Stripe keys. Set `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1`.

- [ ] **Step 2: Start the walmal backend**

Start the walmal API server at `http://localhost:8080`. This is a pre-existing service — not part of this repo.

- [ ] **Step 3: Start dev server**

```bash
npm run dev
```

Expected: server starts at `http://localhost:3000` with no TypeScript errors.

- [ ] **Step 4: Manual golden-path smoke test**

Visit each route and verify no console errors:

| Route | Expected |
|---|---|
| `http://localhost:3000/` | Home page renders with featured products |
| `/products` | Product grid renders |
| `/products/<slug>` | Product detail with variant selector |
| Click "Add to cart" | Cart icon badge increments |
| `/cart` | Cart items visible, quantities editable |
| `/checkout` | Guest vs. login choice appears |
| Choose guest → fill email + address | Address form renders |
| `/login` | Login form renders |
| `/register` | Register form renders |
| `/account` (not logged in) | Redirects to `/login?next=/account` |

- [ ] **Step 5: Verify Stripe payment flow**

Use Stripe test card `4242 4242 4242 4242`, expiry `12/34`, CVC `123`.

Expected:
1. Payment intent created (check Network tab for `POST /api/payment-intent` → 200)
2. Card payment succeeds
3. `POST /api/v1/orders` fired
4. Redirect to `/order-confirmation`

- [ ] **Step 6: Final commit if any .env adjustments were made**

```bash
git add .
git commit -m "chore: verify smoke test and finalize dev setup"
```

---

## Self-review checklist

**Spec coverage:**

| Requirement | Task(s) |
|---|---|
| `/` SSG with revalidation | Task 13 |
| `/products` SSR | Task 13 |
| `/products/[slug]` SSR + generateMetadata | Task 13 |
| `/cart` client-only | Task 14 |
| `/checkout` client-only | Task 18 |
| `/account` + `/account/orders/[id]` client-only | Task 16 |
| Auth guard → redirect to `/login` | Task 10 |
| CUSTOMER role check | Task 8 |
| Cart persists in localStorage | Task 9 |
| Merge guest cart on login | Tasks 8 + 9 (guarded) |
| CartItem shape | Task 3 |
| Stripe Payment Intents (not Checkout Sessions) | Task 7 |
| Secret key server-side only | Task 7 |
| Stripe Elements for card input | Task 17 |
| POST /api/v1/orders on success only | Task 17 |
| Show error, no order on failure | Task 17 |
| Guest: email + shipping, no account | Task 17 |
| order-failed state shows paymentIntentId | Task 17 |
| Axios client with auth interceptor | Task 5 |
| 401 → logout + redirect | Task 5 |
| SSR pages use fetch() not Axios | Task 6 |
| Silent refresh (guarded) | Task 10 |
| ApiError typed errors | Task 5 |
| .env.local.example documented | Task 19 |
