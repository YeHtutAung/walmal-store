import { describe, expect, it } from 'vitest'
import { deriveBrandFacets, applyFilters, sortProducts } from '@/lib/listing-filters'
import type { Product } from '@/types/product'

const p = (productId: string, name: string, brand?: string, lowestPrice?: number): Product =>
  ({ productId, name, slug: productId, brand, lowestPrice })

const CATALOG = [
  p('1', 'Velocity Elite FG Boot', 'Walmal Pro', 1199.99),
  p('2', 'Grip Training Socks', 'Walmal Sport', 22),
  p('3', 'Match Ball', 'Walmal Sport', 79),
  p('4', 'Mystery Item', undefined, 10),
  p('5', 'Unpriced Boot', 'Walmal Pro', undefined),
]

describe('deriveBrandFacets', () => {
  it('counts per brand, sorted by count desc then name, excluding undefined brands', () => {
    expect(deriveBrandFacets(CATALOG)).toEqual([
      { brand: 'Walmal Pro', count: 2 },
      { brand: 'Walmal Sport', count: 2 },
    ])
  })
})

describe('applyFilters', () => {
  it('is a no-op with no active filters', () => {
    expect(applyFilters(CATALOG, { brands: new Set(), maxPrice: null })).toEqual(CATALOG)
  })
  it('filters by brand; undefined brand is filtered out when a brand filter is active', () => {
    const out = applyFilters(CATALOG, { brands: new Set(['Walmal Sport']), maxPrice: null })
    expect(out.map((x) => x.productId)).toEqual(['2', '3'])
  })
  it('filters by max price; unknown price is filtered out when a cap is active', () => {
    const out = applyFilters(CATALOG, { brands: new Set(), maxPrice: 80 })
    expect(out.map((x) => x.productId)).toEqual(['2', '3', '4'])
  })
})

describe('sortProducts', () => {
  it('featured preserves input order', () => {
    expect(sortProducts(CATALOG, 'featured')).toEqual(CATALOG)
  })
  it('price-asc sorts cheapest first, missing price last', () => {
    expect(sortProducts(CATALOG, 'price-asc').map((x) => x.productId)).toEqual(['4', '2', '3', '1', '5'])
  })
  it('price-desc sorts dearest first, missing price last', () => {
    expect(sortProducts(CATALOG, 'price-desc').map((x) => x.productId)).toEqual(['1', '3', '2', '4', '5'])
  })
  it('name sorts A-Z and does not mutate the input', () => {
    const input = [...CATALOG]
    const out = sortProducts(input, 'name')
    expect(out.map((x) => x.name)[0]).toBe('Grip Training Socks')
    expect(input).toEqual(CATALOG)
  })
})
