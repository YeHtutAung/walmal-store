'use client'

import Image from 'next/image'
import { useCartStore } from '@/store/cart-store'
import { formatPrice } from '@/lib/utils'
import { resolveMinioUrl } from '@/lib/minio-url'
import type { CartItem } from '@/types/cart'

export function BagLineItem({ item }: { item: CartItem }) {
  const updateQty = useCartStore((s) => s.updateQty)
  const removeItem = useCartStore((s) => s.removeItem)
  const imageSrc = resolveMinioUrl(item.imageUrl) ?? item.imageUrl

  return (
    <div className="flex gap-3.5 border-t border-[#1a1a1e] py-4 lg:gap-5 lg:py-6">
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={item.productName}
          width={118}
          height={118}
          className="h-20 w-20 shrink-0 rounded-[11px] bg-[#f1f1ee] object-cover lg:h-[118px] lg:w-[118px]"
        />
      ) : (
        <div
          className="h-20 w-20 shrink-0 rounded-[11px] bg-[#f1f1ee] lg:h-[118px] lg:w-[118px]"
          aria-hidden="true"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <p className="truncate text-[14px] font-bold text-foreground lg:text-[17px]">
            {item.productName}
          </p>
          {item.variantName && (
            <p className="mt-0.5 text-[12px] text-[#8a8a90]">{item.variantName}</p>
          )}
        </div>

        <div className="mt-2 flex items-center gap-4">
          <div
            role="group"
            aria-label={`Quantity, ${item.productName}`}
            className="flex items-center rounded-[9px] border border-[#26262c] bg-card"
          >
            <button
              type="button"
              onClick={() => {
                if (item.quantity > 1) updateQty(item.variantId, item.quantity - 1)
              }}
              disabled={item.quantity <= 1}
              aria-label={`Decrease quantity, ${item.productName}`}
              className="flex h-8 w-8 items-center justify-center text-foreground transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-foreground lg:h-[38px] lg:w-[38px]"
            >
              −
            </button>
            <span aria-live="polite" className="min-w-6 px-0.5 text-center text-[13.5px] text-foreground">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQty(item.variantId, item.quantity + 1)}
              aria-label={`Increase quantity, ${item.productName}`}
              className="flex h-8 w-8 items-center justify-center text-foreground transition-colors hover:text-primary lg:h-[38px] lg:w-[38px]"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.variantId)}
            aria-label={`Remove ${item.productName}`}
            className="text-[12px] text-[#6b6b73] underline transition-colors hover:text-foreground"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-heading text-[22px] text-foreground">
          {formatPrice(item.price * item.quantity)}
        </p>
        {item.quantity > 1 && (
          <p className="mt-0.5 text-[11.5px] text-[#8a8a90]">{formatPrice(item.price)} each</p>
        )}
      </div>
    </div>
  )
}
