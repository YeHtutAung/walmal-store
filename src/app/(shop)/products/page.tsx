'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProductGrid } from '@/components/product/product-grid'
import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { ProductListResponse } from '@/types/product'

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const { status } = useAuth()
  const [data, setData] = useState<ProductListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const category = searchParams.get('category') ?? undefined
  const sort = searchParams.get('sort') ?? undefined
  const page = searchParams.get('page') ?? '1'

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'guest') { setLoading(false); return }

    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (sort) params.set('sort', sort)
    params.set('page', page)

    apiClient
      .get<ProductListResponse>(`/products?${params}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message ?? 'Failed to load products'))
      .finally(() => setLoading(false))
  }, [status, category, sort, page])

  if (status === 'guest') {
    return (
      <div className="container mx-auto px-4 py-8 text-center space-y-4">
        <p className="text-muted-foreground">Sign in to browse products.</p>
        <Button asChild><Link href="/login?next=/products">Sign in</Link></Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        Products {category && <span className="text-muted-foreground">— {category}</span>}
      </h1>
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
