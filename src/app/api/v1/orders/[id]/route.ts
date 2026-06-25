import { NextResponse } from 'next/server'
import { mockDb } from '@/lib/mock-db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = mockDb.orders[id]

  if (!order) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Order not found.' }, { status: 404 })
  }

  return NextResponse.json({ data: order })
}
