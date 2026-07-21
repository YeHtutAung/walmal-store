import { NextRequest, NextResponse } from 'next/server'
import { draftMode } from 'next/headers'
import { publicOrigin } from '@/lib/public-origin'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const expected = process.env.CONTENT_PREVIEW_TOKEN

  if (!expected || token !== expected) {
    return new NextResponse('Invalid preview token', { status: 401 })
  }

  ;(await draftMode()).enable()
  // Redirect to the PUBLIC site root — not new URL('/', req.url), which behind
  // the proxy resolves to the internal 0.0.0.0:3000 and dead-ends in the browser.
  return NextResponse.redirect(`${publicOrigin(req)}/`)
}
