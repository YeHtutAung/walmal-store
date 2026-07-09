import { describe, it, expect, vi, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getClientIp, parseLimit } from '@/lib/rate-limit'

afterEach(() => {
  vi.useRealTimers()
})

// jsdom cannot construct a real NextRequest; a header-stub is all getClientIp reads.
function stubRequest(headers: Record<string, string>): NextRequest {
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  } as unknown as NextRequest
}

describe('checkRateLimit', () => {
  it('allows requests up to the limit, then rejects with retryAfter >= 1', () => {
    const config = { limit: 3, windowMs: 60_000 }
    for (let i = 1; i <= 3; i++) {
      expect(checkRateLimit('t-allow:1.1.1.1', config)).toEqual({ allowed: true, retryAfter: 0 })
    }
    const rejected = checkRateLimit('t-allow:1.1.1.1', config)
    expect(rejected.allowed).toBe(false)
    expect(rejected.retryAfter).toBeGreaterThanOrEqual(1)
    expect(rejected.retryAfter).toBeLessThanOrEqual(60)
  })

  it('resets the counter after the window elapses', () => {
    vi.useFakeTimers()
    const config = { limit: 1, windowMs: 60_000 }
    expect(checkRateLimit('t-window:1.1.1.1', config).allowed).toBe(true)
    expect(checkRateLimit('t-window:1.1.1.1', config).allowed).toBe(false)
    vi.advanceTimersByTime(60_001)
    expect(checkRateLimit('t-window:1.1.1.1', config).allowed).toBe(true)
  })

  it('isolates buckets per key (route and IP)', () => {
    const config = { limit: 1, windowMs: 60_000 }
    expect(checkRateLimit('t-iso-login:1.2.3.4', config).allowed).toBe(true)
    expect(checkRateLimit('t-iso-login:1.2.3.4', config).allowed).toBe(false)
    // different IP, same route: unaffected
    expect(checkRateLimit('t-iso-login:5.6.7.8', config).allowed).toBe(true)
    // same IP, different route: unaffected
    expect(checkRateLimit('t-iso-register:1.2.3.4', config).allowed).toBe(true)
  })
})

describe('getClientIp', () => {
  it('returns the first x-forwarded-for entry, trimmed', () => {
    expect(getClientIp(stubRequest({ 'x-forwarded-for': ' 9.9.9.9 , 10.0.0.1' }))).toBe('9.9.9.9')
  })

  it('falls back to x-real-ip', () => {
    expect(getClientIp(stubRequest({ 'x-real-ip': '8.8.8.8' }))).toBe('8.8.8.8')
  })

  it("returns 'unknown' when no forwarding headers are present", () => {
    expect(getClientIp(stubRequest({}))).toBe('unknown')
  })
})

describe('parseLimit', () => {
  it('parses valid positive numbers and falls back otherwise', () => {
    expect(parseLimit('25', 10)).toBe(25)
    expect(parseLimit(undefined, 10)).toBe(10)
    expect(parseLimit('abc', 10)).toBe(10)
    expect(parseLimit('-5', 10)).toBe(10)
    expect(parseLimit('0', 10)).toBe(10)
  })
})
