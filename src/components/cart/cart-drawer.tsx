'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CartItem } from './cart-item'
import { CartSummary } from './cart-summary'
import { useCart } from '@/hooks/use-cart'

interface CartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { items } = useCart()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Your cart ({items.length})</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto divide-y">
          {items.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">Your cart is empty.</p>
          ) : (
            items.map((item) => <CartItem key={item.variantId} item={item} />)
          )}
        </div>
        {items.length > 0 && <CartSummary />}
      </SheetContent>
    </Sheet>
  )
}
