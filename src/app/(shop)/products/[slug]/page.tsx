'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ProductDetail } from '@/components/product/product-detail'
import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product } from '@/types/product'

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const { status } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'guest') { setLoading(false); return }

    apiClient
      .get<Product>(`/products/${slug}`)
      .then((res) => setProduct(res.data))
      .catch((err) => {
        if (err?.status === 404) setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [status, slug])

  if (status === 'guest') {
    return (
      <div className="container mx-auto px-4 py-8 text-center space-y-4">
        <p className="text-muted-foreground">Sign in to view this product.</p>
        <Button asChild><Link href={`/login?next=/products/${slug}`}>Sign in</Link></Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center space-y-4">
        <p className="text-muted-foreground">Product not found.</p>
        <Button variant="outline" asChild><Link href="/products">Back to products</Link></Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ProductDetail product={product} />
    </div>
  )
}
