export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export interface ShippingAddress {
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface OrderItem {
  variantId: string
  productName: string
  variantName: string
  price: number
  quantity: number
  imageUrl: string
}

export interface OrderSummary {
  id: string
  status: OrderStatus
  total: number
  createdAt: string
  itemCount: number
}

export interface Order {
  id: string
  status: OrderStatus
  items: OrderItem[]
  shippingAddress: ShippingAddress
  total: number
  paymentIntentId: string
  createdAt: string
  guestEmail?: string
}

export interface CreateOrderPayload {
  paymentIntentId: string
  items: OrderItem[]
  shippingAddress: ShippingAddress
  guestEmail?: string
}
