import { NextResponse } from 'next/server'

function makeToken(payload: Record<string, string>, expiresIn = 3600) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresIn })).toString('base64')
  return `${header}.${body}.mock-sig`
}

function decodeTokenPayload(token: string): Record<string, string> {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
  } catch {
    return {}
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  const { refreshToken } = body

  if (!refreshToken) {
    return NextResponse.json(
      { code: 'INVALID_TOKEN', message: 'Refresh token is required.' },
      { status: 401 },
    )
  }

  const payload = decodeTokenPayload(refreshToken)
  const sub = payload.sub ?? 'user-unknown'
  const username = payload.username ?? 'unknown'
  const role = payload.role ?? 'CUSTOMER'

  return NextResponse.json({
    accessToken: makeToken({ sub, username, role }),
    refreshToken: makeToken({ sub, username, role }, 86400),
    tokenType: 'Bearer',
    expiresIn: 3600,
  })
}
