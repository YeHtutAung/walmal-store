import { Hero } from '@/components/home/hero'
import { CategoryTiles } from '@/components/home/category-tiles'
import { ProductRail } from '@/components/home/product-rail'
import { PromoBanner } from '@/components/home/promo-banner'
import { BestSellers } from '@/components/home/best-sellers'
import { TrustBar } from '@/components/home/trust-bar'
import { fetchProductsSSG } from '@/lib/api/products'
import { fetchHomeContent } from '@/lib/api/home-content'
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
  const home = await fetchHomeContent()
  // Search DTO exposes no createdAt — response order stands in for recency (see docs/kb)
  const arrivals = products.slice(0, 6)
  const best = products.slice(6, 14)

  return (
    <div className="pb-10">
      <Hero content={home?.hero} />
      <CategoryTiles tiles={home?.categoryTiles} />
      <ProductRail heading="New Arrivals" products={arrivals} />
      <PromoBanner content={home?.promo} />
      <BestSellers products={best} />
      <TrustBar />
    </div>
  )
}
