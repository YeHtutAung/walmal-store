'use client'

import Link from 'next/link'
import { ProductCard } from '@/components/product/product-card'
import { decorativeRating, starString, formatReviews } from '@/lib/decorative-ratings'
import type { Product } from '@/types/product'

// Static merchandising badges keyed by V17 product names (see docs/kb).
const BADGES: Record<string, string> = {
  'Harbour City FC 26/27 Home Jersey': 'Best seller',
  'National Team Authentic Home Jersey': 'Authentic',
  'Lite Carbon Shinguards': '-15%',
}

export function BestSellers({ products }: { products: Product[] }) {
  if (products.length === 0) return null
  return (
    <section className="mx-auto max-w-[1360px] px-4 pb-2 pt-6 lg:px-8 lg:pt-11">
      <div className="mb-[22px] flex items-baseline justify-between">
        <h2 className="display-heading text-[26px] text-white lg:text-[38px]">Best Sellers</h2>
        <Link
          href="/products"
          className="label-caps text-[11px] font-bold text-[#c9c9cf] transition-colors hover:text-primary lg:text-[13px]"
        >
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-[13px] lg:grid-cols-4 lg:gap-[18px]">
        {products.map((product) => {
          const rating = decorativeRating(product.productId)
          return (
            <ProductCard key={product.productId} product={product} badge={BADGES[product.name]}>
              <p className="mt-1 text-xs tracking-[1px] text-[#e0a615]">
                {starString(rating.stars)}{' '}
                <span className="text-[11.5px] tracking-normal text-neutral-400">
                  ({formatReviews(rating.reviews)})
                </span>
              </p>
            </ProductCard>
          )
        })}
      </div>
    </section>
  )
}
