'use client'

import type { ListingSort } from '@/lib/listing-filters'

interface ListingToolbarProps {
  count: number
  sort: ListingSort
  onSetSort: (sort: ListingSort) => void
}

export function ListingToolbar({ count, sort, onSetSort }: ListingToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-4">
      {/* The number and "products" MUST stay in this one element's text —
          TC-E2E-003 matches `text=/\d+ products/`. */}
      <span className="text-[13.5px] text-muted-foreground">
        <b className="font-bold text-foreground">{count}</b> products
      </span>
      <div className="flex items-center gap-2.5">
        <span className="label-caps text-[11px] text-[#8a8a90]">Sort</span>
        <select
          value={sort}
          onChange={(e) => onSetSort(e.target.value as ListingSort)}
          aria-label="Sort products"
          className="label-caps rounded-[9px] border border-input bg-secondary px-3 py-2 text-[12px] text-foreground"
        >
          <option value="featured">Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name">Name: A–Z</option>
        </select>
      </div>
    </div>
  )
}
