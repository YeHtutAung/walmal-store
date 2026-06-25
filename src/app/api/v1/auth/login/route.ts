import { NextResponse } from 'next/server'

const MOCK_USERS = [
  { username: 'customer_test', password: 'TestPass123!', role: 'CUSTOMER', sub: 'user-customer-001' },
  { username: 'admin_test', password: 'AdminPass123!', role: 'ADMIN', sub: 'user-admin-001' },
]

function makeToken(payload: Record<string, string>, expiresIn = 3600) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresIn })).toString('base64')
  return `${header}.${body}.mock-sig`
}

export async function POST(req: Request) {
  const body = await req.json()
  const { username, password } = body

  const user = MOCK_USERS.find((u) => u.username === username && u.password === password)
  if (!user) {
    return NextResponse.json(
      { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' },
      { status: 401 },
    )
  }

  return NextResponse.json({
    accessToken: makeToken({ sub: user.sub, username: user.username, role: user.role }),
    refreshToken: makeToken({ sub: user.sub, username: user.username, role: user.role }, 86400),
    tokenType: 'Bearer',
    expiresIn: 3600,
  })
}
