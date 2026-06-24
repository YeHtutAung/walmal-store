import { NextResponse } from 'next/server'
import { mockProducts } from '@/data/mock-products'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = mockProducts.find((p) => p.productId === id || p.slug === id)
  if (!product) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Product not found' }, { status: 404 })
  }
  return NextResponse.json({ data: product })
}
