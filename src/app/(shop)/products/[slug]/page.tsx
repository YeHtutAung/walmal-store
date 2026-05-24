import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductDetail } from '@/components/product/product-detail'
import { fetchProduct, fetchProductsSSG } from '@/lib/api/products'
import { ApiError } from '@/lib/api/client'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const { slug } = await params
    const product = await fetchProduct(slug)
    return {
      title: product.name,
      description: product.description,
      openGraph: { images: [product.imageUrl] },
    }
  } catch {
    return { title: 'Product not found' }
  }
}

export async function generateStaticParams() {
  try {
    const { products } = await fetchProductsSSG()
    return products.slice(0, 20).map((p) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  try {
    const { slug } = await params
    const product = await fetchProduct(slug)
    return (
      <div className="container mx-auto px-4 py-8">
        <ProductDetail product={product} />
      </div>
    )
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }
}
