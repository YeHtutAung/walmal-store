import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import { resolveMinioUrl } from '@/lib/minio-url'
import type { Product } from '@/types/product'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="group overflow-hidden" data-testid="product-card">
      <Link href={`/products/${product.productId}`} data-testid="product-card-link">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.primaryImageUrl ? (
            <Image
              src={resolveMinioUrl(product.primaryImageUrl)!}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No image</div>
          )}
        </div>
        <CardContent className="p-4">
          {product.brand && <p className="text-xs text-muted-foreground">{product.brand}</p>}
          <h3 className="mt-1 font-semibold line-clamp-2">{product.name}</h3>
        </CardContent>
        <CardFooter className="px-4 pb-4 pt-0">
          {product.lowestPrice != null ? (
            <span className="text-sm font-medium">
              From {formatPrice(product.lowestPrice, product.currency)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Price unavailable</span>
          )}
        </CardFooter>
      </Link>
    </Card>
  )
}
