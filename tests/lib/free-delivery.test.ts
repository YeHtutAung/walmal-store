import { describe, expect, it } from 'vitest'
import { FREE_DELIVERY_THRESHOLD, freeDeliveryProgress } from '@/lib/free-delivery'

describe('freeDeliveryProgress', () => {
  it('threshold matches the announced $80', () => {
    expect(FREE_DELIVERY_THRESHOLD).toBe(80)
  })
  it('under threshold: not qualified, remaining and pct computed', () => {
    expect(freeDeliveryProgress(22)).toEqual({ qualifies: false, remaining: 58, pct: 27.5 })
  })
  it('at threshold: qualifies, zero remaining, 100 pct', () => {
    expect(freeDeliveryProgress(80)).toEqual({ qualifies: true, remaining: 0, pct: 100 })
  })
  it('over threshold clamps pct to 100', () => {
    expect(freeDeliveryProgress(1199.99)).toEqual({ qualifies: true, remaining: 0, pct: 100 })
  })
  it('zero subtotal: 0 pct, full remaining', () => {
    expect(freeDeliveryProgress(0)).toEqual({ qualifies: false, remaining: 80, pct: 0 })
  })
})
