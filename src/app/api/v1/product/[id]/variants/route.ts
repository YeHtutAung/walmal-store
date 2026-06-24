import { NextResponse } from 'next/server'
import { mockVariants } from '@/data/mock-products'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const variants = mockVariants[id] ?? []
  return NextResponse.json({ data: variants })
}
