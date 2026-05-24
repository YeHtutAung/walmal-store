import { apiClient } from './client'
import type { Order, OrderSummary, CreateOrderPayload } from '@/types/order'

export async function createOrder(payload: CreateOrderPayload): Promise<{ orderId: string }> {
  const res = await apiClient.post<{ orderId: string }>('/orders', payload)
  return res.data
}

export async function fetchOrders(): Promise<OrderSummary[]> {
  const res = await apiClient.get<OrderSummary[]>('/orders')
  return res.data
}

export async function fetchOrder(id: string): Promise<Order> {
  const res = await apiClient.get<Order>(`/orders/${id}`)
  return res.data
}
