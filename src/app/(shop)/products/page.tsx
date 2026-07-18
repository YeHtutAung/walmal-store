'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ProductCard } from '@/components/product/product-card'
import { FilterSidebar } from '@/components/listing/filter-sidebar'
import { ListingToolbar } from '@/components/listing/listing-toolbar'
import { CategoryChipRail } from '@/components/listing/category-chip-rail'
import { decorativeRating, starString, formatReviews } from '@/lib/decorative-ratings'
import { deriveBrandFacets, applyFilters, sortProducts, type ListingSort } from '@/lib/listing-filters'
import { fetchProducts, fetchProductsByCategory } from '@/lib/api/products'
import { fetchCategoryTree, findActiveCategoryBySlug } from '@/lib/api/categories'
import { useAuth } from '@/hooks/use-auth'
import type { ProductListResponse } from '@/types/product'
import type { Category } from '@/lib/api/categories'

// Cached across renders/navigations so the category tree (rarely changing) is
// fetched once per page load rather than on every effect run. A failed fetch
// clears the cache so a subsequent retry re-fetches instead of re-throwing.
let treePromise: Promise<Category[]> | null = null
function getTree(): Promise<Category[]> {
  return (treePromise ??= fetchCategoryTree().catch((err) => {
    treePromise = null
    throw err
  }))
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8"><h1 className="text-3xl font-bold mb-8">Products</h1><p className="text-muted-foreground">Loading…</p></div>}>
      <ProductsContent />
    </Suspense>
  )
}

function ProductsContent() {
  const searchParams = useSearchParams()
  const { status } = useAuth()
  const [data, setData] = useState<ProductListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [heading, setHeading] = useState('Products')

  const [brands, setBrands] = useState<Set<string>>(new Set())
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const [sort, setSort] = useState<ListingSort>('featured')

  const search = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? '1')
  const categorySlug = searchParams.get('category')

  useEffect(() => {
    // Wait for the auth provider to settle before fetching (avoids a redundant
    // request that would be cancelled once the refresh token resolves).
    if (status === 'idle' || status === 'loading') return

    let cancelled = false
    /* eslint-disable react-hooks/set-state-in-effect -- reset the fetch-status
       flags and active filters synchronously when query params change; the
       fetch itself is async and cancellation-guarded */
    setLoading(true)
    setError(null)
    setBrands(new Set())
    setMaxPrice(null)
    /* eslint-enable react-hooks/set-state-in-effect */

    async function load(): Promise<{ heading: string; data: ProductListResponse }> {
      if (categorySlug) {
        const tree = await getTree()
        const category = findActiveCategoryBySlug(tree, categorySlug)
        if (category) {
          const data = await fetchProductsByCategory(category.categoryId, { page })
          return { heading: category.name, data }
        }
      }
      const data = await fetchProducts({ search, page })
      return { heading: 'Products', data }
    }

    load()
      .then(({ heading, data }) => {
        if (!cancelled) {
          setHeading(heading)
          setData(data)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to load products')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [status, search, page, categorySlug])

  const facets = deriveBrandFacets(data?.products ?? [])
  const prices = (data?.products ?? [])
    .map((p) => p.lowestPrice)
    .filter((v): v is number => v != null)
  const priceCeiling = Math.ceil(Math.max(0, ...prices) / 100) * 100 || 100
  const shown = sortProducts(applyFilters(data?.products ?? [], { brands, maxPrice }), sort)

  function toggleBrand(brand: string) {
    setBrands((prev) => {
      const next = new Set(prev)
      if (next.has(brand)) next.delete(brand)
      else next.add(brand)
      return next
    })
  }

  function clearAll() {
    setBrands(new Set())
    setMaxPrice(null)
  }

  return (
    <div>
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-6 lg:py-9">
          <nav aria-label="Breadcrumb">
            <p className="label-caps text-[12px] text-[#6b6b73]">
              <Link href="/" className="transition-colors hover:text-foreground">
                Home
              </Link>{' '}
              / {heading}
            </p>
          </nav>
          <h1 className="display-heading mt-2 text-[34px] text-foreground lg:text-[56px]">{heading}</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading && <p className="text-muted-foreground">Loading…</p>}
        {error && <p className="text-destructive">{error}</p>}
        {data && (
          <div className="mx-auto grid max-w-[1360px] gap-9 lg:grid-cols-[248px_1fr]">
            <FilterSidebar
              facets={facets}
              brands={brands}
              maxPrice={maxPrice}
              priceCeiling={priceCeiling}
              onToggleBrand={toggleBrand}
              onSetMaxPrice={setMaxPrice}
              onClearAll={clearAll}
            />
            <div>
              <CategoryChipRail activeSlug={categorySlug} />
              <ListingToolbar count={shown.length} sort={sort} onSetSort={setSort} />

              {data.products.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">No products found.</div>
              ) : shown.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center">
                  <h2 className="display-heading text-[24px] text-foreground">No matches</h2>
                  <p className="mt-2 max-w-[320px] text-[13.5px] text-[#8a8a90]">
                    Try widening your filters or raising the max price.
                  </p>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="label-caps mt-5 rounded-[11px] bg-primary px-6 py-3 text-[12px] text-primary-foreground transition-colors hover:bg-primary/85"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-2 gap-[13px] lg:grid-cols-3 lg:gap-5">
                  {shown.map((p) => {
                    const rating = decorativeRating(p.productId)
                    return (
                      <ProductCard key={p.productId} product={p}>
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
