export interface ProductVariant {
  id: string
  name: string
  price: number
  stock: number
  imageUrl: string
}

export interface Product {
  id: string
  slug: string
  name: string
  description: string
  category: string
  imageUrl: string
  variants: ProductVariant[]
}

export interface ProductListResponse {
  products: Product[]
  total: number
  page: number
  pageSize: number
}
