import { NextRequest, NextResponse } from 'next/server'
import { mockProducts } from '@/data/mock-products'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const page = Number(req.nextUrl.searchParams.get('page') ?? '0')
  const size = Number(req.nextUrl.searchParams.get('size') ?? '20')

  let filtered = mockProducts
  if (q) {
    const lower = q.toLowerCase()
    filtered = mockProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.categoryName?.toLowerCase().includes(lower) ||
        p.brand?.toLowerCase().includes(lower),
    )
  }

  const start = page * size
  const content = filtered.slice(start, start + size)

  return NextResponse.json({
    data: {
      content,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    },
  })
}
