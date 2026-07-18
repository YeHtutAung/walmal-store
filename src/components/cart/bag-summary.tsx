'use client'

import Link from 'next/link'
import { useCart } from '@/hooks/use-cart'
import { formatPrice } from '@/lib/utils'
import { freeDeliveryProgress } from '@/lib/free-delivery'

// Reads the persisted cart store — must render inside a mounted gate (the
// cart page's useMounted branch) or server HTML can mismatch hydration.
export function BagSummary() {
  const { subtotal, subtotalFormatted } = useCart()
  const { qualifies, remaining, pct } = freeDeliveryProgress(subtotal)

  return (
    <div className="rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24 lg:p-7">
      <h2 className="label-caps text-[12px] text-[#8a8a90]">Order summary</h2>

      <div className="mt-4 flex justify-between text-[14px] text-foreground">
        <span>Subtotal</span>
        <span>{subtotalFormatted}</span>
      </div>

      {qualifies ? (
        <div className="mt-3 flex justify-between text-[13px]">
          <span className="text-[#8a8a90]">Delivery</span>
          <span className="font-bold text-[#4caf6e]">Free</span>
        </div>
      ) : (
        <div className="mt-3">
          {/* Decorative — the caption below carries the same information. */}
          <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-[#26262c]">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-[12px] text-[#8a8a90]">
            Add {formatPrice(remaining)} more for free local delivery.
          </p>
        </div>
      )}

      <div className="mt-4 flex justify-between border-t border-[#1a1a1e] pt-4">
        <span className="label-caps self-center text-[12px] text-foreground">Total</span>
        <span className="font-heading text-[30px] text-foreground">{subtotalFormatted}</span>
      </div>

      <p className="mt-2 text-[11.5px] text-[#6b6b73]">
        Shipping and taxes calculated at checkout.
      </p>

      <Link
        href="/checkout"
        className="label-caps mt-5 flex h-14 w-full items-center justify-center rounded-xl bg-primary text-[13px] text-primary-foreground transition-colors hover:bg-primary/85"
      >
        Checkout <span aria-hidden="true">→</span>
      </Link>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] text-[#8a8a90]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#4caf6e]" aria-hidden="true" />
        Secure encrypted checkout
      </p>

      <div className="mt-4 flex justify-center gap-2">
        {['VISA', 'MC', 'AMEX'].map((brand) => (
          <span
            key={brand}
            className="label-caps rounded-md border border-[#26262c] bg-[#1c1c21] px-2 py-1.5 text-[10px] text-[#8a8a90]"
          >
            {brand}
          </span>
        ))}
      </div>
    </div>
  )
}
