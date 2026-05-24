import { serverFetch } from './server'
import { apiClient } from './client'
import type { Product, ProductListResponse } from '@/types/product'

export interface ProductsQuery {
  category?: string
  sort?: string
  page?: number
}

export function fetchProducts(query: ProductsQuery = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams()
  if (query.category) params.set('category', query.category)
  if (query.sort) params.set('sort', query.sort)
  if (query.page) params.set('page', String(query.page))
  const qs = params.toString() ? `?${params}` : ''
  return serverFetch<ProductListResponse>(`/products${qs}`, { cache: 'no-store' })
}

export function fetchProduct(slug: string): Promise<Product> {
  return serverFetch<Product>(`/products/${slug}`, { cache: 'no-store' })
}

export function fetchProductsSSG(): Promise<ProductListResponse> {
  return serverFetch<ProductListResponse>('/products', {
    next: { revalidate: 3600 },
  })
}

export async function fetchProductClient(slug: string): Promise<Product> {
  const res = await apiClient.get<Product>(`/products/${slug}`)
  return res.data
}
