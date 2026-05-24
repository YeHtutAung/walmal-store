'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/hooks/use-cart'

export function CartSummary() {
  const { subtotalFormatted, itemCount } = useCart()

  return (
    <div className="space-y-4">
      <Separator />
      <div className="flex justify-between font-medium">
        <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
        <span>{subtotalFormatted}</span>
      </div>
      <p className="text-xs text-muted-foreground">Shipping and taxes calculated at checkout.</p>
      <Button className="w-full" size="lg" asChild>
        <Link href="/checkout">Proceed to checkout</Link>
      </Button>
      <Button variant="outline" className="w-full" asChild>
        <Link href="/products">Continue shopping</Link>
      </Button>
    </div>
  )
}
