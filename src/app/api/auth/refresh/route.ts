import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp, REFRESH_LIMIT } from '@/lib/rate-limit'

// NOTE: Uses NEXT_PUBLIC_API_URL as the proxy target. In production, prefer a
// server-only env var (e.g. SPRING_INTERNAL_URL) if the Spring URL is a private VPC address.
const SPRING_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
const SECURE = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`refresh:${getClientIp(req)}`, REFRESH_LIMIT)
  if (!rl.allowed) {
    return NextResponse.json(
      { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }
  const refreshToken = req.cookies.get('walmal-rt')?.value
  if (!refreshToken) {
    return NextResponse.json({ code: 'NO_COOKIE', message: 'No refresh token cookie.' }, { status: 401 })
  }
  let upstream: Response
  try {
    upstream = await fetch(`${SPRING_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
  } catch {
    return NextResponse.json(
      { code: 'UPSTREAM_UNAVAILABLE', message: 'Auth service unreachable.' },
      { status: 503 }
    )
  }
  let data: Record<string, unknown>
  try {
    data = await upstream.json()
  } catch {
    return NextResponse.json(
      { code: 'UPSTREAM_ERROR', message: 'Upstream returned a non-JSON response.' },
      { status: 502 }
    )
  }
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status })
  }
  const { refreshToken: newRefreshToken, ...clientData } = data
  if (!newRefreshToken) {
    return NextResponse.json(
      { code: 'UPSTREAM_ERROR', message: 'Upstream did not return a refresh token.' },
      { status: 502 }
    )
  }
  const res = NextResponse.json(clientData)
  res.cookies.set('walmal-rt', newRefreshToken as string, {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
