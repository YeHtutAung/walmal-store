'use client'

import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import type { ProductVariant } from '@/types/product'

interface VariantSelectorProps {
  variants: ProductVariant[]
  selectedId: string | null
  onSelect: (variant: ProductVariant) => void
}

export function VariantSelector({ variants, selectedId, onSelect }: VariantSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Select variant</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => (
          <Button
            key={variant.id}
            variant={selectedId === variant.id ? 'default' : 'outline'}
            size="sm"
            disabled={variant.stock === 0}
            onClick={() => onSelect(variant)}
          >
            {variant.name}
            <span className="ml-2 text-xs">{formatPrice(variant.price)}</span>
            {variant.stock === 0 && <span className="ml-1 text-xs">(Out of stock)</span>}
          </Button>
        ))}
      </div>
    </div>
  )
}
