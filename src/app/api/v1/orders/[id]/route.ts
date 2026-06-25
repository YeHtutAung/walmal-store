import { NextResponse } from 'next/server'
import { mockDb } from '@/lib/mock-db'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!req.headers.get('authorization')?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const order = mockDb.orders[id]

  if (!order) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Order not found.' }, { status: 404 })
  }

  return NextResponse.json({ data: order })
}
