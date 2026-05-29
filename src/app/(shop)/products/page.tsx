'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProductGrid } from '@/components/product/product-grid'
import { fetchProducts } from '@/lib/api/products'
import { useAuth } from '@/hooks/use-auth'
import type { ProductListResponse } from '@/types/product'

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const { status } = useAuth()
  const [data, setData] = useState<ProductListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const search = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? '1')

  useEffect(() => {
    // Wait for the auth provider to settle before fetching (avoids a redundant
    // request that would be cancelled once the refresh token resolves).
    if (status === 'idle' || status === 'loading') return

    setLoading(true)
    setError(null)
    fetchProducts({ search, page })
      .then(setData)
      .catch((err) => setError(err?.message ?? 'Failed to load products'))
      .finally(() => setLoading(false))
  }, [status, search, page])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Products</h1>
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
