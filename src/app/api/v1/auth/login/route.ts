import { NextResponse } from 'next/server'

const MOCK_USERS = [
  { username: 'customer_test', password: 'TestPass123!', role: 'CUSTOMER' },
  { username: 'admin_test', password: 'AdminPass123!', role: 'ADMIN' },
]

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
    accessToken: `mock-access-${user.username}-${Date.now()}`,
    refreshToken: `mock-refresh-${user.username}-${Date.now()}`,
    tokenType: 'Bearer',
    expiresIn: 3600,
    role: user.role,
  })
}
