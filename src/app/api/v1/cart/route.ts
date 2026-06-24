import { NextResponse } from 'next/server'

let mockCart: unknown[] = []

export async function GET() {
  return NextResponse.json(mockCart)
}

export async function PUT(req: Request) {
  const body = await req.json()
  mockCart = body.items ?? []
  return NextResponse.json({ success: true })
}
