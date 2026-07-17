import { Hero } from '@/components/home/hero'
import { CategoryTiles } from '@/components/home/category-tiles'
import { ProductRail } from '@/components/home/product-rail'
import { PromoBanner } from '@/components/home/promo-banner'
import { BestSellers } from '@/components/home/best-sellers'
import { TrustBar } from '@/components/home/trust-bar'
import { fetchProductsSSG } from '@/lib/api/products'
import type { Product } from '@/types/product'

export const revalidate = 3600

export default async function HomePage() {
  let products: Product[] = []
  try {
    const data = await fetchProductsSSG()
    products = data.products
  } catch {
    // Backend unavailable at build time; sections render without products
  }
  // Search DTO exposes no createdAt — response order stands in for recency (see docs/kb)
  const arrivals = products.slice(0, 6)
  const best = products.slice(6, 14)

  return (
    <div className="pb-10">
      <Hero />
      <CategoryTiles />
      <ProductRail heading="New Arrivals" products={arrivals} />
      <PromoBanner />
      <BestSellers products={best} />
      <TrustBar />
    </div>
  )
}
