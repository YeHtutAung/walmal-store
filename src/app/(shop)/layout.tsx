'use client'

import { useState } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { BottomTabBar } from '@/components/layout/bottom-tab-bar'
import { CartDrawer } from '@/components/cart/cart-drawer'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  // Single shared CartDrawer for the shop chrome — opened by the header Bag
  // button (desktop) and the bottom tab bar Bag tab (mobile).
  const [cartOpen, setCartOpen] = useState(false)
  const openCart = () => setCartOpen(true)

  return (
    // pb offsets the fixed BottomTabBar so page content isn't hidden behind it.
    <div className="flex min-h-screen flex-col pb-[62px] lg:pb-0">
      <SiteHeader onOpenCart={openCart} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <BottomTabBar onOpenCart={openCart} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  )
}
