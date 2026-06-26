import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side route protection for /account pages.
 * Reads the `walmal-auth` presence cookie set by auth-store on login/register.
 * This is a UX guard only — actual security is enforced by backend JWT validation.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.has('walmal-auth')) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: ['/account/:path*'],
}
