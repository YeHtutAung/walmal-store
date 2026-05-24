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
