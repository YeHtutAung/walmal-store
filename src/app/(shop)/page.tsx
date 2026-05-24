import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ProductGrid } from '@/components/product/product-grid'
import { fetchProductsSSG } from '@/lib/api/products'
import type { Product } from '@/types/product'

export const revalidate = 3600

export default async function HomePage() {
  let products: Product[] = []
  try {
    const data = await fetchProductsSSG()
    products = data.products
  } catch {
    // Backend unavailable at build time; page hydrates with empty featured list
  }
  const featured = products.slice(0, 4)

  return (
    <div className="container mx-auto px-4 py-12 space-y-16">
      <section className="text-center space-y-4 py-12">
        <h1 className="text-5xl font-bold tracking-tight">Welcome to Walmal</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover quality products curated for you.
        </p>
        <Button size="lg" asChild>
          <Link href="/products">Shop now</Link>
        </Button>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6">Featured products</h2>
        <ProductGrid products={featured} />
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/products">View all products</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
