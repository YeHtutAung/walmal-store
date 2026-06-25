import { NextResponse } from 'next/server'
import { mockDb } from '@/lib/mock-db'

function makeToken(payload: Record<string, string>, expiresIn = 3600) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresIn })).toString('base64')
  return `${header}.${body}.mock-sig`
}

export async function POST(req: Request) {
  const body = await req.json()
  const { email, username } = body

  if (!email || !username) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Email and username are required.' },
      { status: 400 },
    )
  }

  if (mockDb.registeredEmails.has(email)) {
    return NextResponse.json(
      { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' },
      { status: 409 },
    )
  }

  mockDb.registeredEmails.add(email)
  const sub = `user-${username}-${Date.now()}`

  return NextResponse.json({
    accessToken: makeToken({ sub, username, role: 'CUSTOMER' }),
    refreshToken: makeToken({ sub, username, role: 'CUSTOMER' }, 86400),
    tokenType: 'Bearer',
    expiresIn: 3600,
  })
}
