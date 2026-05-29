'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/hooks/use-cart'

interface CartIconButtonProps {
  onClick?: () => void
}

export function CartIconButton({ onClick }: CartIconButtonProps) {
  const { itemCount } = useCart()

  const badge = itemCount > 0 && (
    <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
      {itemCount > 99 ? '99+' : itemCount}
    </Badge>
  )

  if (onClick) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={`Cart (${itemCount} items)`}
        onClick={onClick}
      >
        <ShoppingCart className="h-5 w-5" />
        {badge}
      </Button>
    )
  }

  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link href="/cart" aria-label={`Cart (${itemCount} items)`}>
        <ShoppingCart className="h-5 w-5" />
        {badge}
      </Link>
    </Button>
  )
}
