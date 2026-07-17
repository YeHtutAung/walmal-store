'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { useWishlistStore } from '@/store/wishlist-store'
import { formatPrice } from '@/lib/utils'
import { resolveMinioUrl } from '@/lib/minio-url'

export default function SavedPage() {
  const router = useRouter()
  const items = useWishlistStore((s) => s.items)
  const remove = useWishlistStore((s) => s.remove)

  // Wishlist is persisted in localStorage — server HTML always renders the
  // pre-hydration state, so gate BOTH the list and the empty/list decision
  // behind a mounted flag to avoid a hydration mismatch / empty-state flash.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="display-heading text-[34px] text-foreground">Saved</h1>
      <p className="mt-1 text-[13px] text-[#8a8a90]">
        {mounted && items.length > 0
          ? `${items.length} item${items.length === 1 ? '' : 's'} saved for later`
          : 'Your wishlist'}
      </p>

      {!mounted ? null : items.length === 0 ? (
        <div className="flex flex-col items-center px-[30px] py-[70px] text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[#26262c]">
            <Heart className="h-6 w-6 text-[#3a3a42]" aria-hidden="true" />
          </span>
          <h2 className="display-heading mt-5 text-[24px] text-foreground">
            Nothing saved yet
          </h2>
          <p className="mt-2 max-w-[280px] text-[13.5px] text-[#8a8a90]">
            Tap the heart on any product to keep it here for later.
          </p>
          <Link
            href="/products"
            className="label-caps mt-6 rounded-[11px] bg-primary px-[26px] py-3.5 text-[12.5px] text-primary-foreground transition-colors hover:bg-primary/85"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="mt-4">
          {items.map((item) => {
            const imageSrc = resolveMinioUrl(item.imageUrl)
            return (
              <li
                key={item.productId}
                className="flex items-center gap-4 border-t border-[#1a1a1e] py-4"
              >
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={item.name}
                    width={80}
                    height={80}
                    className="h-20 w-20 shrink-0 rounded-[11px] bg-muted object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 shrink-0 rounded-[11px] bg-muted" aria-hidden="true" />
                )}

                <div className="min-w-0 flex-1">
                  {item.brand && (
                    <p className="label-caps text-[9.5px] text-[#9a9a9f]">{item.brand}</p>
                  )}
                  <p className="truncate text-[14px] font-bold text-foreground">{item.name}</p>
                  {item.price != null && (
                    <p className="font-heading text-[17px] text-foreground">
                      {formatPrice(item.price, item.currency)}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  {/* TODO(B7): use shared addProductToBag helper (single-vs-multi-variant rule) */}
                  <button
                    type="button"
                    onClick={() => router.push(`/products/${item.productId}`)}
                    className="label-caps rounded-[9px] bg-primary px-4 py-[9px] text-[10.5px] text-primary-foreground transition-colors hover:bg-primary/85"
                  >
                    Add to bag
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.productId)}
                    className="text-[12px] text-[#6b6b73] underline transition-colors hover:text-foreground"
                  >
                    Remove
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
