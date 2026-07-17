import { describe, expect, it } from 'vitest'
import { decorativeRating } from '@/lib/decorative-ratings'

describe('decorativeRating', () => {
  it('is deterministic for the same id', () => {
    expect(decorativeRating('abc')).toEqual(decorativeRating('abc'))
  })
  it('stays in range', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
      const r = decorativeRating(id)
      expect(r.stars).toBeGreaterThanOrEqual(4)
      expect(r.stars).toBeLessThanOrEqual(5)
      expect(r.reviews).toBeGreaterThanOrEqual(120)
      expect(r.reviews).toBeLessThanOrEqual(3400)
    }
  })
})
