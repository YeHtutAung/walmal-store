export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED'

export interface ShippingAddress {
  line1: string
  line2?: string
  city: string
  postalCode: string
  country: string
}

export interface OrderItem {
  variantId: string
  productNameSnapshot: string
  skuSnapshot: string
  quantity: number
  priceAtPurchase: number
  currency: string
  subtotal: number
}

export interface OrderSummary {
  id: string
  status: OrderStatus
  totalAmount: number
  currency: string
  createdAt: string
}

export interface Order {
  id: string
  userId: string
  status: OrderStatus
  totalAmount: number
  currency: string
  shippingAddress: ShippingAddress
  items: OrderItem[]
  createdAt: string
}

export interface CreateOrderPayload {
  currency: string
  items: { variantId: string; locationId: string; quantity: number }[]
  shippingAddress: ShippingAddress
  guestEmail?: string
  // Stripe PaymentIntent id for the payment the shopper just confirmed. The
  // backend verifies it server-side before confirming the order, so it is required.
  paymentReference: string
}
