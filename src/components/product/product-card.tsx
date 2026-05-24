import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types/product'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const lowestPrice = Math.min(...product.variants.map((v) => v.price))

  return (
    <Card className="group overflow-hidden">
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{product.category}</p>
          <h3 className="mt-1 font-semibold line-clamp-2">{product.name}</h3>
        </CardContent>
        <CardFooter className="px-4 pb-4 pt-0">
          <span className="text-sm font-medium">From {formatPrice(lowestPrice)}</span>
        </CardFooter>
      </Link>
    </Card>
  )
}
