'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProductGrid } from '@/components/product/product-grid'
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

  const search = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? '1')
  const categorySlug = searchParams.get('category')

  useEffect(() => {
    // Wait for the auth provider to settle before fetching (avoids a redundant
    // request that would be cancelled once the refresh token resolves).
    if (status === 'idle' || status === 'loading') return

    let cancelled = false
    setLoading(true)
    setError(null)

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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{heading}</h1>
      {loading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">{error}</p>}
      {data && (
        <>
          <p className="text-sm text-muted-foreground mb-6">{data.total} products</p>
          <ProductGrid products={data.products} />
        </>
      )}
    </div>
  )
}
