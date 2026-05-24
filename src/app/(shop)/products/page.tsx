import type { Metadata } from 'next'
import { ProductGrid } from '@/components/product/product-grid'
import { fetchProducts } from '@/lib/api/products'

export const metadata: Metadata = {
  title: 'Products',
  description: 'Browse all products at Walmal.',
}

interface ProductsPageProps {
  searchParams: Promise<{ category?: string; sort?: string; page?: string }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams
  const { products, total } = await fetchProducts({
    category: params.category,
    sort: params.sort,
    page: params.page ? Number(params.page) : 1,
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        Products {params.category && <span className="text-muted-foreground">— {params.category}</span>}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">{total} products</p>
      <ProductGrid products={products} />
    </div>
  )
}
