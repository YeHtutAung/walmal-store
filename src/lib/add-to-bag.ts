import { fetchProductVariants } from '@/lib/api/products'
import { useCartStore } from '@/store/cart-store'
import { toast } from 'sonner'
import type { Product } from '@/types/product'

/** Single ACTIVE variant → add straight to bag; otherwise route to the detail
 *  page where the variant selector lives. Returns 'added' | 'navigate'.
 *  CartItem fields mirror product-detail.tsx exactly (raw primaryImageUrl —
 *  the cart drawer resolves MinIO URLs at render time). */
export async function addProductToBag(product: Product): Promise<'added' | 'navigate'> {
  const variants = (await fetchProductVariants(product.productId)).filter((v) => v.status === 'ACTIVE')
  if (variants.length !== 1 || product.lowestPrice == null) return 'navigate'
  const variant = variants[0]
  useCartStore.getState().addItem({
    variantId: variant.variantId,
    productName: product.name,
    variantName: [variant.name, variant.color, variant.size].filter(Boolean).join(' · ') || variant.sku,
    price: product.lowestPrice,
    quantity: 1,
    imageUrl: product.primaryImageUrl ?? '',
  })
  toast.success(`${product.name} added to bag`)
  return 'added'
}
