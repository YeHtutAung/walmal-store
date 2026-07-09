import type { NextRequest } from 'next/server'

/**
 * In-memory fixed-window rate limiter for Next.js route handlers.
 *
 * Single-instance, node-runtime only: counters live in a module-level Map,
 * reset on server restart, and are NOT shared across instances. Do not use
 * from edge-runtime code. See
 * docs/superpowers/specs/2026-07-10-payment-intent-rate-limiting-design.md
 */

export interface RateLimitConfig {
  limit: number
  windowMs: number
}

interface Bucket {
  count: number
  resetAt: number
}

const WINDOW_MS = 60_000
const MAX_ENTRIES = 10_000

const buckets = new Map<string, Bucket>()

/** Parse a positive integer limit from an env value; fall back on anything else. */
export function parseLimit(envValue: string | undefined, fallback: number): number {
  const n = Number(envValue)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

// The configs below are parsed ONCE at module load. Changing process.env
// afterwards (e.g. in a test beforeEach) has no effect; tests pass explicit
// RateLimitConfig objects instead.

export const PAYMENT_INTENT_LIMIT: RateLimitConfig = {
  limit: parseLimit(process.env.RATE_LIMIT_PAYMENT_INTENT, 10),
  windowMs: WINDOW_MS,
}

export const LOGIN_LIMIT: RateLimitConfig = {
  limit: parseLimit(process.env.RATE_LIMIT_LOGIN, 5),
  windowMs: WINDOW_MS,
}

export const REGISTER_LIMIT: RateLimitConfig = {
  limit: parseLimit(process.env.RATE_LIMIT_REGISTER, 3),
  windowMs: WINDOW_MS,
}

export const REFRESH_LIMIT: RateLimitConfig = {
  limit: parseLimit(process.env.RATE_LIMIT_REFRESH, 20),
  windowMs: WINDOW_MS,
}

/**
 * Fixed-window check. `limit: 10` allows requests 1-10 in a window; request 11
 * is the first rejection. When allowed, retryAfter is 0; when rejected,
 * retryAfter is whole seconds until the window resets (min 1). Never throws.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfter: number } {
  const now = Date.now()

  // Lazy cleanup: only when the map grows large, sweep expired buckets.
  if (buckets.size > MAX_ENTRIES) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k)
    }
  }

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  bucket.count++
  if (bucket.count > config.limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  return { allowed: true, retryAfter: 0 }
}

/**
 * Client IP for rate-limit keying: first x-forwarded-for entry, else x-real-ip,
 * else 'unknown' (direct connections in dev share one bucket — acceptable for
 * a single instance behind a proxy in production).
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip') ?? 'unknown'
}
