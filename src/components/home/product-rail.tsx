'use client'

import Link from 'next/link'
import { ProductCard } from '@/components/product/product-card'
import type { Product } from '@/types/product'

interface ProductRailProps {
  heading: string
  products: Product[]
  viewAllHref?: string
}

export function ProductRail({ heading, products, viewAllHref = '/products' }: ProductRailProps) {
  if (products.length === 0) return null
  return (
    <section className="mx-auto max-w-[1360px] px-4 pb-2 pt-5 lg:px-8 lg:pt-11">
      <div className="mb-[22px] flex items-baseline justify-between">
        <h2 className="display-heading text-[26px] text-white lg:text-[38px]">{heading}</h2>
        <Link
          href={viewAllHref}
          className="label-caps text-[11px] font-bold text-[#c9c9cf] transition-colors hover:text-primary lg:text-[13px]"
        >
          View all →
        </Link>
      </div>
      <div className="flex snap-x gap-[13px] overflow-x-auto pb-3.5 lg:gap-[18px] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#2a2a30]">
        {products.map((product) => (
          <div key={product.productId} className="w-[200px] flex-none snap-start lg:w-[270px]">
            <ProductCard product={product} badge="New" />
          </div>
        ))}
      </div>
    </section>
  )
}
