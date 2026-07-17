'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { resolveMinioUrl } from '@/lib/minio-url'
import { addProductToBag } from '@/lib/add-to-bag'
import type { Product } from '@/types/product'

interface ProductCardProps {
  product: Product
  badge?: string
  /** Extra row rendered between the name and the price/Add row (e.g. stars). */
  children?: React.ReactNode
}

export function ProductCard({ product, badge, children }: ProductCardProps) {
  const router = useRouter()

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const result = await addProductToBag(product)
    if (result === 'navigate') router.push(`/products/${product.productId}`)
  }

  return (
    <div
      className="group flex h-full flex-col overflow-hidden rounded-[14px] bg-white text-neutral-900 transition-transform duration-200 hover:-translate-y-1"
      data-testid="product-card"
    >
      <Link href={`/products/${product.productId}`} data-testid="product-card-link" className="flex h-full flex-col">
        <div className="relative aspect-square overflow-hidden bg-[#f1f1ee]">
          {badge && (
            <span
              className={`label-caps absolute left-3 top-3 z-10 rounded-md px-2 py-1 text-[10.5px] text-white ${
                badge === 'New' ? 'bg-primary' : 'bg-[#0c0c0e]'
              }`}
            >
              {badge}
            </span>
          )}
          {product.primaryImageUrl ? (
            <Image
              src={resolveMinioUrl(product.primaryImageUrl)!}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">No image</div>
          )}
        </div>
        <div className="flex flex-1 flex-col px-[15px] pb-[17px] pt-[15px]">
          {product.brand && <p className="label-caps text-[11px] text-neutral-400">{product.brand}</p>}
          <h3 className="mt-1 line-clamp-2 min-h-[38px] text-[15px] font-bold leading-tight">{product.name}</h3>
          {children}
          <div className="mt-auto flex items-center justify-between pt-2.5">
            {product.lowestPrice != null ? (
              <span className="font-heading text-[19px]">{formatPrice(product.lowestPrice, product.currency)}</span>
            ) : (
              <span className="text-sm text-neutral-400">Price unavailable</span>
            )}
            <button
              type="button"
              onClick={handleAdd}
              className="label-caps rounded-[9px] bg-[#0c0c0e] px-3.5 py-2 text-[11.5px] text-white transition-colors hover:bg-primary"
            >
              Add
            </button>
          </div>
        </div>
      </Link>
    </div>
  )
}
