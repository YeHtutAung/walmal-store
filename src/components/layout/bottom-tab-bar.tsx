'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, Home, ShoppingBag, Store } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { useWishlistStore } from '@/store/wishlist-store'

interface BottomTabBarProps {
  onOpenCart: () => void
}

function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -right-2.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-extrabold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

const tabClasses = (active: boolean) =>
  `flex flex-col items-center justify-center gap-1 py-0.5 transition-opacity ${
    active ? 'text-foreground opacity-100' : 'text-[#8a8a90] opacity-[.62]'
  }`

export function BottomTabBar({ onOpenCart }: BottomTabBarProps) {
  const pathname = usePathname()

  // Counts come from persisted (localStorage) stores — render 0 until mounted
  // so server HTML and first client render match (hydration guard).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const { itemCount } = useCart()
  const savedItems = useWishlistStore((s) => s.items.length)
  const cartCount = mounted ? itemCount : 0
  const savedCount = mounted ? savedItems : 0

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 inset-x-0 z-40 grid grid-cols-4 border-t border-[#1e1e22] bg-[rgba(12,12,14,.96)] px-1.5 pb-3 pt-[9px] backdrop-blur-[10px] lg:hidden"
    >
      <Link href="/" aria-label="Home" className={tabClasses(isActive('/'))}>
        <Home className="h-[19px] w-[19px]" aria-hidden="true" />
        <span className="label-caps text-[9.5px] font-bold">Home</span>
      </Link>

      <Link href="/products" aria-label="Shop" className={tabClasses(isActive('/products'))}>
        <Store className="h-[19px] w-[19px]" aria-hidden="true" />
        <span className="label-caps text-[9.5px] font-bold">Shop</span>
      </Link>

      <Link
        href="/saved"
        aria-label={`Saved items (${savedCount})`}
        className={tabClasses(isActive('/saved'))}
      >
        <span className="relative">
          <Heart className="h-[19px] w-[19px]" aria-hidden="true" />
          <TabBadge count={savedCount} />
        </span>
        <span className="label-caps text-[9.5px] font-bold">Saved</span>
      </Link>

      <button
        type="button"
        onClick={onOpenCart}
        aria-label={`Open bag (${cartCount} items)`}
        className={tabClasses(false)}
      >
        <span className="relative">
          <ShoppingBag className="h-[19px] w-[19px]" aria-hidden="true" />
          <TabBadge count={cartCount} />
        </span>
        <span className="label-caps text-[9.5px] font-bold">Bag</span>
      </button>
    </nav>
  )
}
