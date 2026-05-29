import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { createOrder, fetchOrders, fetchOrder } from '@/lib/api/orders'
import type { Order, OrderSummary, CreateOrderPayload } from '@/types/order'

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
