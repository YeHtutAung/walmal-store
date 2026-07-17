'use client'

import { useState } from 'react'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'

interface StripePaymentProps {
  clientSecret: string
  onSuccess: (paymentIntentId: string) => Promise<void>
  disabled?: boolean
}

export function StripePayment({ clientSecret, onSuccess, disabled }: StripePaymentProps) {
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
      clientSecret,
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
            hidePostalCode: true,
            style: {
              base: { fontSize: '16px', color: '#f4f4f2', iconColor: '#9a9a9f', '::placeholder': { color: '#9a9a9f' } },
              invalid: { color: '#e0281b' },
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
