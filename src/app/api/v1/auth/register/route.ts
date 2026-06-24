import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json()
  const { email, username } = body

  if (!email || !username) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Email and username are required.' },
      { status: 400 },
    )
  }

  return NextResponse.json({
    accessToken: `mock-access-${username}-${Date.now()}`,
    refreshToken: `mock-refresh-${username}-${Date.now()}`,
    tokenType: 'Bearer',
    expiresIn: 3600,
    role: 'CUSTOMER',
  })
}
