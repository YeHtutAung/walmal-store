'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
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
                  <div key={item.variantId} className="flex justify-between pt-4 first:pt-0">
                    <div>
                      <p className="font-medium">{item.productNameSnapshot}</p>
                      <p className="text-sm text-muted-foreground">{item.skuSnapshot}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-medium">{formatPrice(item.subtotal, item.currency)}</span>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatPrice(order.totalAmount, order.currency)}</span>
            </div>

            <section>
              <h2 className="mb-2 font-semibold">Shipping address</h2>
              <address className="not-italic text-sm text-muted-foreground">
                {order.shippingAddress.line1}<br />
                {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
                {order.shippingAddress.city} {order.shippingAddress.postalCode}<br />
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
