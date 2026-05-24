'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/hooks/use-cart'

export function CartIconButton() {
  const { itemCount } = useCart()

  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link href="/cart" aria-label={`Cart (${itemCount} items)`}>
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
            {itemCount > 99 ? '99+' : itemCount}
          </Badge>
        )}
      </Link>
    </Button>
  )
}
