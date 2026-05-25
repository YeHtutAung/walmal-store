'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { VariantSelector } from './variant-selector'
import { useCart } from '@/hooks/use-cart'
import { formatPrice } from '@/lib/utils'
import type { Product, ProductVariant } from '@/types/product'

interface ProductDetailProps {
  product: Product
  variants: ProductVariant[]
}

export function ProductDetail({ product, variants }: ProductDetailProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [added, setAdded] = useState(false)
  const { addItem } = useCart()

  function handleAddToCart() {
    if (!selectedVariant) return
    addItem({
      variantId: selectedVariant.variantId,
      productName: product.name,
      variantName: [selectedVariant.name, selectedVariant.color, selectedVariant.size].filter(Boolean).join(' · ') || selectedVariant.sku,
      price: product.lowestPrice ?? 0,
      quantity: 1,
      imageUrl: product.primaryImageUrl ?? '',
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.name}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
        )}
      </div>

      <div className="space-y-6">
        <div>
          {product.brand && <p className="text-sm text-muted-foreground">{product.brand}</p>}
          {product.categoryName && <p className="text-xs text-muted-foreground">{product.categoryName}</p>}
          <h1 className="mt-1 text-3xl font-bold">{product.name}</h1>
          {product.lowestPrice != null && (
            <p className="mt-2 text-2xl font-semibold">
              {formatPrice(product.lowestPrice, product.currency)}
            </p>
          )}
        </div>

        {product.description && (
          <p className="text-muted-foreground">{product.description}</p>
        )}

        <VariantSelector
          variants={variants}
          selectedId={selectedVariant?.variantId ?? null}
          onSelect={setSelectedVariant}
        />

        <Button
          size="lg"
          className="w-full"
          disabled={!selectedVariant}
          onClick={handleAddToCart}
        >
          {added ? 'Added to cart!' : 'Add to cart'}
        </Button>
      </div>
    </div>
  )
}
