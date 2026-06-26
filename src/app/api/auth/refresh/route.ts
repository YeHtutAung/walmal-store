import { NextRequest, NextResponse } from 'next/server'

const SPRING_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
const SECURE = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('walmal-rt')?.value
  if (!refreshToken) {
    return NextResponse.json({ code: 'NO_COOKIE', message: 'No refresh token cookie.' }, { status: 401 })
  }
  const upstream = await fetch(`${SPRING_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const data = await upstream.json()
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status })
  }
  const { refreshToken: newRefreshToken, ...clientData } = data
  const res = NextResponse.json(clientData)
  res.cookies.set('walmal-rt', newRefreshToken, {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
