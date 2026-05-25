'use client'

import { Button } from '@/components/ui/button'
import type { ProductVariant } from '@/types/product'

interface VariantSelectorProps {
  variants: ProductVariant[]
  selectedId: string | null
  onSelect: (variant: ProductVariant) => void
}

export function VariantSelector({ variants, selectedId, onSelect }: VariantSelectorProps) {
  const active = variants.filter((v) => v.status === 'ACTIVE')

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Select variant</p>
      <div className="flex flex-wrap gap-2">
        {active.map((variant) => {
          const label = [variant.name, variant.color, variant.size].filter(Boolean).join(' · ') || variant.sku
          return (
            <Button
              key={variant.variantId}
              variant={selectedId === variant.variantId ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelect(variant)}
            >
              {label}
            </Button>
          )
        })}
        {active.length === 0 && (
          <p className="text-sm text-muted-foreground">No variants available</p>
        )}
      </div>
    </div>
  )
}
