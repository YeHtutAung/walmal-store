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
}

export function ProductDetail({ product }: ProductDetailProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [added, setAdded] = useState(false)
  const { addItem } = useCart()

  function handleAddToCart() {
    if (!selectedVariant) return
    addItem({
      variantId: selectedVariant.id,
      productName: product.name,
      variantName: selectedVariant.name,
      price: selectedVariant.price,
      quantity: 1,
      imageUrl: selectedVariant.imageUrl || product.imageUrl,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="relative aspect-square overflow-hidden rounded-lg">
        <Image
          src={selectedVariant?.imageUrl || product.imageUrl}
          alt={product.name}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">{product.category}</p>
          <h1 className="mt-1 text-3xl font-bold">{product.name}</h1>
          {selectedVariant && (
            <p className="mt-2 text-2xl font-semibold">{formatPrice(selectedVariant.price)}</p>
          )}
        </div>

        <p className="text-muted-foreground">{product.description}</p>

        <VariantSelector
          variants={product.variants}
          selectedId={selectedVariant?.id ?? null}
          onSelect={setSelectedVariant}
        />

        <Button
          size="lg"
          className="w-full"
          disabled={!selectedVariant || selectedVariant.stock === 0}
          onClick={handleAddToCart}
        >
          {added ? 'Added to cart!' : 'Add to cart'}
        </Button>
      </div>
    </div>
  )
}
