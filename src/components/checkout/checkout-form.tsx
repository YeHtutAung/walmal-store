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

  useEffect(() => {
    if (isAuthenticated) setMode('authenticated')
  }, [isAuthenticated])

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
          <Link href="/login?next=/checkout">Sign in / Register</Link>
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
          {isAuthenticated ? 'Shipping details' : 'Your details'}
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
              clientSecret={clientSecret}
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
