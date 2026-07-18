'use client'

import Link from 'next/link'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { BagLineItem } from '@/components/cart/bag-line-item'
import { BagSummary } from '@/components/cart/bag-summary'
import { useCart } from '@/hooks/use-cart'
import { useMounted } from '@/hooks/use-mounted'

export default function CartPage() {
  const { items, itemCount } = useCart()
  // Cart is persisted in localStorage — server HTML always renders the
  // pre-hydration state, so gate the items/empty decision behind a mounted
  // flag to avoid a hydration mismatch (same rule as /saved).
  const mounted = useMounted()

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border">
          <div className="container mx-auto px-4 py-6 lg:py-9">
            <nav aria-label="Breadcrumb">
              <p className="label-caps text-[12px] text-[#6b6b73]">
                <Link href="/" className="transition-colors hover:text-foreground">
                  Home
                </Link>{' '}
                / Bag
              </p>
            </nav>
            <h1 className="display-heading mt-2 text-[34px] text-foreground lg:text-[56px]">
              Your Bag <span className="text-[#3a3a42]">({mounted ? itemCount : 0})</span>
            </h1>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {!mounted ? null : items.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <h2 className="display-heading text-[28px] text-foreground">Your bag is empty</h2>
              <p className="mt-2 max-w-[320px] text-[13.5px] text-[#8a8a90]">
                Looks like you haven&apos;t added anything yet. Let&apos;s fix that.
              </p>
              <Link
                href="/products"
                className="label-caps mt-6 rounded-[11px] bg-primary px-[26px] py-3.5 text-[12.5px] text-primary-foreground transition-colors hover:bg-primary/85"
              >
                Shop the store
              </Link>
            </div>
          ) : (
            <div className="grid gap-10 lg:grid-cols-[1fr_384px]">
              <div>
                <div className="label-caps flex justify-between border-b border-border pb-3 text-[11px] text-[#8a8a90]">
                  <span>Item</span>
                  <span>Total</span>
                </div>
                {items.map((item) => (
                  <BagLineItem key={item.variantId} item={item} />
                ))}
                <Link
                  href="/products"
                  className="mt-6 inline-block text-[13px] text-[#8a8a90] transition-colors hover:text-foreground"
                >
                  <span aria-hidden="true">←</span> Continue shopping
                </Link>
              </div>
              <div>
                <BagSummary />
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
