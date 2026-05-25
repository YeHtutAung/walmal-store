export interface ProductVariant {
  variantId: string
  productId: string
  sku: string
  name?: string
  color?: string
  size?: string
  status: 'ACTIVE' | 'INACTIVE'
}

export interface Product {
  productId: string
  name: string
  slug: string
  brand?: string
  description?: string
  primaryImageUrl?: string
  lowestPrice?: number
  currency?: string
  categoryName?: string
  variants?: ProductVariant[]
}

export interface ProductListResponse {
  products: Product[]
  total: number
  totalPages: number
}
