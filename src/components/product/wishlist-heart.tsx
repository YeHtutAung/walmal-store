'use client'

import { Heart } from 'lucide-react'
import { useWishlistStore } from '@/store/wishlist-store'
import { useMounted } from '@/hooks/use-mounted'
import type { Product } from '@/types/product'

interface WishlistHeartProps {
  product: Product
  /** 'card' overlays the product image; 'detail' sits on the page background. */
  size?: 'card' | 'detail'
}

export function WishlistHeart({ product, size = 'card' }: WishlistHeartProps) {
  const toggle = useWishlistStore((s) => s.toggle)
  const inStore = useWishlistStore((s) =>
    s.items.some((i) => i.productId === product.productId),
  )
  // Saved state is persisted (localStorage) — render unsaved until mounted so
  // server HTML matches the first client render (hydration guard).
  const mounted = useMounted()
  const saved = mounted && inStore

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    toggle({
      productId: product.productId,
      name: product.name,
      brand: product.brand,
      price: product.lowestPrice,
      currency: product.currency,
      imageUrl: product.primaryImageUrl,
    })
  }

  const shell =
    size === 'card'
      ? 'h-8 w-8 bg-white/[.92] hover:bg-white'
      : 'h-11 w-11 border border-border bg-secondary hover:border-primary'
  const icon = size === 'card' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
      className={`flex items-center justify-center rounded-full transition-colors ${shell}`}
    >
      <Heart
        className={`transition-colors ${icon} ${saved ? 'fill-primary text-primary' : 'text-[#c8c8c4]'}`}
        aria-hidden="true"
      />
    </button>
  )
}
