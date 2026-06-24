import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return NextResponse.json({
    data: {
      id,
      userId: 'mock-user',
      status: 'PENDING',
      totalAmount: 0,
      currency: 'USD',
      shippingAddress: { line1: '', city: '', postalCode: '', country: 'US' },
      items: [],
      createdAt: new Date().toISOString(),
    },
  })
}
