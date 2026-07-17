import { apiClient } from './client'
import type { Product, ProductListResponse, ProductVariant } from '@/types/product'

interface ApiPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
}

interface ApiResponse<T> {
  data: T
}

export interface ProductsQuery {
  search?: string
  page?: number
  size?: number
}

export async function fetchProducts(query: ProductsQuery = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams()
  params.set('q', query.search ?? '')
  params.set('page', String(query.page ? query.page - 1 : 0))
  params.set('size', String(query.size ?? 20))
  const res = await apiClient.get<ApiResponse<ApiPage<Product>>>(`/product/search?${params}`)
  const page = res.data.data
  return { products: page.content, total: page.totalElements, totalPages: page.totalPages }
}

export async function fetchProductsByCategory(categoryId: string, query: ProductsQuery = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams()
  params.set('page', String(query.page ? query.page - 1 : 0))
  params.set('size', String(query.size ?? 20))
  const res = await apiClient.get<ApiResponse<ApiPage<Product>>>(`/product/categories/${categoryId}/products?${params}`)
  const page = res.data.data
  return { products: page.content, total: page.totalElements, totalPages: page.totalPages }
}

export async function fetchProduct(productId: string): Promise<Product> {
  const res = await apiClient.get<ApiResponse<Product>>(`/product/${productId}`)
  return res.data.data
}

export async function fetchProductVariants(productId: string): Promise<ProductVariant[]> {
  const res = await apiClient.get<ApiResponse<ProductVariant[]>>(`/product/${productId}/variants`)
  return res.data.data
}

export async function fetchProductsSSG(): Promise<ProductListResponse> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
  const res = await fetch(`${base}/product/search?q=&page=0&size=20`, {
    next: { revalidate: 3600 },
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to fetch products')
  const json: ApiResponse<ApiPage<Product>> = await res.json()
  const page = json.data
  return { products: page.content, total: page.totalElements, totalPages: page.totalPages }
}
