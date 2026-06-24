import { NextRequest, NextResponse } from 'next/server'

const mockOrders: Record<string, unknown> = {}

export async function POST(req: Request) {
  const body = await req.json()
  const orderId = `order-${Date.now()}`

  mockOrders[orderId] = {
    id: orderId,
    userId: 'mock-user',
    status: 'PENDING',
    totalAmount: body.items?.reduce((sum: number, i: { quantity: number }) => sum + i.quantity * 10, 0) ?? 0,
    currency: body.currency ?? 'USD',
    shippingAddress: body.shippingAddress,
    items: body.items?.map((i: { variantId: string; quantity: number }) => ({
      variantId: i.variantId,
      productNameSnapshot: 'Product',
      skuSnapshot: 'SKU',
      quantity: i.quantity,
      priceAtPurchase: 10,
      currency: body.currency ?? 'USD',
      subtotal: i.quantity * 10,
    })) ?? [],
    createdAt: new Date().toISOString(),
  }

  return NextResponse.json({ data: orderId })
}

export async function GET(_req: NextRequest) {
  const orders = Object.values(mockOrders).map((o: unknown) => {
    const order = o as { id: string; status: string; totalAmount: number; currency: string; createdAt: string }
    return {
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      currency: order.currency,
      createdAt: order.createdAt,
    }
  })

  return NextResponse.json({
    data: { content: orders, totalElements: orders.length },
  })
}
