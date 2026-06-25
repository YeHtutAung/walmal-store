import { apiClient } from './client'
import type { Order, OrderSummary, CreateOrderPayload } from '@/types/order'

interface ApiResponse<T> { data: T }
interface ApiPage<T> { content: T[]; totalElements: number }

export async function createOrder(payload: CreateOrderPayload): Promise<{ orderId: string }> {
  const res = await apiClient.post<ApiResponse<string>>('/orders', payload)
  return { orderId: res.data.data }
}

export async function fetchOrders(): Promise<OrderSummary[]> {
  const res = await apiClient.get<ApiResponse<ApiPage<OrderSummary>>>('/orders?page=0&size=50')
  return res.data.data.content
}

export async function fetchOrder(id: string): Promise<Order> {
  const res = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`)
  return res.data.data
}

export async function fetchDefaultLocationId(): Promise<string> {
  const res = await apiClient.get<ApiResponse<{ id: string; active: boolean; bufferLocation: boolean }>>('/inventory/locations/default')
  return res.data.data.id
}
