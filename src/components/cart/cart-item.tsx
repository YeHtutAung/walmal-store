'use client'

import Image from 'next/image'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/hooks/use-cart'
import { resolveMinioUrl } from '@/lib/minio-url'
import type { CartItem as CartItemType } from '@/types/cart'

export function CartItem({ item }: { item: CartItemType }) {
  const { updateQty, removeItem } = useCart()

  return (
    <div className="flex gap-4 py-4">
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border">
        <Image src={resolveMinioUrl(item.imageUrl) ?? item.imageUrl} alt={item.productName} fill className="object-cover" />
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <p className="font-medium">{item.productName}</p>
          <p className="text-sm text-muted-foreground">{item.variantName}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => updateQty(item.variantId, item.quantity - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-6 text-center text-sm">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => updateQty(item.variantId, item.quantity + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{formatPrice(item.price * item.quantity)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => removeItem(item.variantId)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
