import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockCreate = vi.fn()

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function callRoute(body: unknown) {
  vi.resetModules()
  vi.doMock('@/lib/stripe', () => ({
    getStripe: vi.fn(() => ({
      paymentIntents: {
        create: mockCreate,
      },
    })),
  }))
  const { POST } = await import('@/app/api/payment-intent/route')
  return POST(makeRequest(body))
}

describe('POST /api/payment-intent', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockCreate.mockResolvedValue({ client_secret: 'pi_test_secret_xxx' })
  })

  it('valid request { amount: 5000, currency: "usd" } → 200 with clientSecret', async () => {
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

  it('missing currency → 400', async () => {
    const res = await callRoute({ amount: 1000 })
    expect(res.status).toBe(400)
  })

  it('invalid currency "xyz" → 400', async () => {
    const res = await callRoute({ amount: 1000, currency: 'xyz' })
    expect(res.status).toBe(400)
  })

  it('Stripe SDK throws → 500', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Stripe connection error'))
    const res = await callRoute({ amount: 1000, currency: 'usd' })
    expect(res.status).toBe(500)
  })
})
