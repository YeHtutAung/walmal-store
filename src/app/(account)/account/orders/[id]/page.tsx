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
