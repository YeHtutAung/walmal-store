import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json()
  const { refreshToken } = body

  if (!refreshToken) {
    return NextResponse.json(
      { code: 'INVALID_TOKEN', message: 'Refresh token is required.' },
      { status: 401 },
    )
  }

  return NextResponse.json({
    accessToken: `mock-access-refreshed-${Date.now()}`,
    refreshToken: `mock-refresh-refreshed-${Date.now()}`,
    tokenType: 'Bearer',
    expiresIn: 3600,
    role: 'CUSTOMER',
  })
}
