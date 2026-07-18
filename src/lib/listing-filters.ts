import type { Product } from '@/types/product'

export type ListingSort = 'featured' | 'price-asc' | 'price-desc' | 'name'

export interface ListingFilters {
  brands: Set<string>
  maxPrice: number | null
}

export function deriveBrandFacets(products: Product[]): { brand: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const p of products) {
    if (p.brand) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand))
}

export function applyFilters(products: Product[], { brands, maxPrice }: ListingFilters): Product[] {
  return products.filter((p) => {
    // An unknown brand/price cannot be proven to match an active filter — filter it out.
    if (brands.size > 0 && (!p.brand || !brands.has(p.brand))) return false
    if (maxPrice != null && (p.lowestPrice == null || p.lowestPrice > maxPrice)) return false
    return true
  })
}

export function sortProducts(products: Product[], sort: ListingSort): Product[] {
  if (sort === 'featured') return products
  const missingLast = (v: number | undefined) => v ?? Number.POSITIVE_INFINITY
  const out = [...products]
  if (sort === 'price-asc') out.sort((a, b) => missingLast(a.lowestPrice) - missingLast(b.lowestPrice))
  else if (sort === 'price-desc')
    out.sort(
      (a, b) =>
        (b.lowestPrice ?? Number.NEGATIVE_INFINITY) - (a.lowestPrice ?? Number.NEGATIVE_INFINITY),
    )
  else out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}
