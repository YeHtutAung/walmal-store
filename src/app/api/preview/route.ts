import { NextRequest, NextResponse } from 'next/server'
import { draftMode } from 'next/headers'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const expected = process.env.CONTENT_PREVIEW_TOKEN

  if (!expected || token !== expected) {
    return new NextResponse('Invalid preview token', { status: 401 })
  }

  ;(await draftMode()).enable()
  return NextResponse.redirect(new URL('/', req.url))
}
