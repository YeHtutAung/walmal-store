import { NextRequest, NextResponse } from 'next/server'

let mockCart: unknown[] = []

function requireAuth(req: Request): NextResponse | null {
  if (!req.headers.get('authorization')?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function GET(req: NextRequest) {
  const authError = requireAuth(req)
  if (authError) return authError
  return NextResponse.json(mockCart)
}

export async function PUT(req: Request) {
  const authError = requireAuth(req)
  if (authError) return authError
  const body = await req.json()
  mockCart = body.items ?? []
  return NextResponse.json({ success: true })
}
