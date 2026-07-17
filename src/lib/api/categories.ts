import { apiClient } from './client'

export interface Category {
  categoryId: string
  name: string
  slug: string
  active: boolean
  children: Category[]
}

interface ApiResponse<T> {
  data: T
}

export async function fetchCategoryTree(): Promise<Category[]> {
  const res = await apiClient.get<ApiResponse<Category[]>>('/product/categories')
  return res.data.data
}

export function findActiveCategoryBySlug(tree: Category[], slug: string): Category | null {
  for (const node of tree) {
    if (node.active && node.slug === slug) return node
    const child = findActiveCategoryBySlug(node.children ?? [], slug)
    if (child) return child
  }
  return null
}
