import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    data: { id: 'loc-001', active: true, bufferLocation: false },
  })
}
