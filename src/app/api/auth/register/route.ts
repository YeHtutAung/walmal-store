import { NextRequest, NextResponse } from 'next/server'

const SPRING_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
const SECURE = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const upstream = await fetch(`${SPRING_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await upstream.json()
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status })
  }
  const { refreshToken, ...clientData } = data
  const res = NextResponse.json(clientData)
  res.cookies.set('walmal-rt', refreshToken, {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
