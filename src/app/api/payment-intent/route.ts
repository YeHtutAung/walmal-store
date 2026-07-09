import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { checkRateLimit, getClientIp, PAYMENT_INTENT_LIMIT } from '@/lib/rate-limit'

const SUPPORTED_CURRENCIES = new Set(['usd', 'eur', 'gbp', 'sgd', 'myr'])

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`payment-intent:${getClientIp(req)}`, PAYMENT_INTENT_LIMIT)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }
  try {
    const body = await req.json()
    const { amount, currency, metadata = {} } = body

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
    }
    if (!currency || !SUPPORTED_CURRENCIES.has(currency)) {
      return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 })
    }

    const paymentIntent = await getStripe().paymentIntents.create({
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
