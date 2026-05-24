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
