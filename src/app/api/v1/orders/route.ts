import { NextRequest, NextResponse } from 'next/server'
import { mockDb } from '@/lib/mock-db'

export async function POST(req: Request) {
  const body = await req.json()
  const orderId = `order-${Date.now()}`

  mockDb.orders[orderId] = {
    id: orderId,
    userId: 'mock-user',
    status: 'PENDING',
    totalAmount: body.items?.reduce((sum: number, i: { quantity: number }) => sum + i.quantity * 10, 0) ?? 0,
    currency: body.currency ?? 'USD',
    shippingAddress: body.shippingAddress ?? { line1: '', city: '', postalCode: '', country: 'US' },
    items: body.items?.map((i: { variantId: string; quantity: number }) => ({
      variantId: i.variantId,
      productNameSnapshot: 'Galaxy S24 Ultra',
      skuSnapshot: 'SAM-S24U-256-BLK',
      quantity: i.quantity,
      priceAtPurchase: 999,
      currency: body.currency ?? 'USD',
      subtotal: i.quantity * 999,
    })) ?? [],
    createdAt: new Date().toISOString(),
  }

  return NextResponse.json({ data: orderId })
}

export async function GET(_req: NextRequest) {
  const orders = Object.values(mockDb.orders).map((o) => ({
    id: o.id,
    status: o.status,
    totalAmount: o.totalAmount,
    currency: o.currency,
    createdAt: o.createdAt,
  }))

  return NextResponse.json({
    data: { content: orders, totalElements: orders.length },
  })
}
