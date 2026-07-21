import { NextRequest, NextResponse } from 'next/server'
import { draftMode } from 'next/headers'
import { publicOrigin } from '@/lib/public-origin'

export async function GET(req: NextRequest) {
  ;(await draftMode()).disable()
  return NextResponse.redirect(`${publicOrigin(req)}/`)
}
