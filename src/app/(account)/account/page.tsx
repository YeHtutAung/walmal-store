'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { fetchOrders } from '@/lib/api/orders'
import { formatPrice } from '@/lib/utils'
import type { OrderSummary } from '@/types/order'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  PAID: 'default',
  SHIPPED: 'default',
  DELIVERED: 'default',
  CANCELLED: 'destructive',
}

export default function AccountPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto flex-1 px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">My account</h1>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Order history</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => <Skeleton key={n} className="h-20 w-full" />)}
            </div>
          ) : orders.length === 0 ? (
            <p className="text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <Link href={`/account/orders/${order.id}`} className="font-medium hover:underline">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()} · {order.itemCount} items
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatPrice(order.total)}</span>
                      <Badge variant={STATUS_VARIANT[order.status] ?? 'default'}>
                        {order.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
