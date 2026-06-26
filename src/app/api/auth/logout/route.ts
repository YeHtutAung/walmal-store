import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({}, { status: 200 })
  res.cookies.set('walmal-rt', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 0,
  })
  return res
}
