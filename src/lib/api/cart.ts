import { apiClient } from './client'
import type { CartItem } from '@/types/cart'

export async function fetchServerCart(): Promise<CartItem[]> {
  const res = await apiClient.get<CartItem[]>('/cart')
  return res.data
}

export async function syncServerCart(items: CartItem[]): Promise<void> {
  await apiClient.put('/cart', { items })
}
