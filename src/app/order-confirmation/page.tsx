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
