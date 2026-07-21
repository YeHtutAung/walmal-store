import type { NextRequest } from 'next/server'

/**
 * The storefront's PUBLIC origin, derived from the reverse proxy's forwarded
 * headers.
 *
 * Behind Caddy the Next.js server sees requests on its internal bind address, so
 * `req.url` / `req.nextUrl.origin` reflect `http://0.0.0.0:3000` — any redirect
 * built from them lands on a dead address (ERR_ADDRESS_INVALID). Caddy sets
 * `X-Forwarded-Host` and `X-Forwarded-Proto` with the original public values, so
 * use those to construct redirect targets. Falls back to the `Host` header, then
 * to `req.nextUrl.origin` for local dev where there is no proxy.
 */
export function publicOrigin(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  return host ? `${proto}://${host}` : req.nextUrl.origin
}
