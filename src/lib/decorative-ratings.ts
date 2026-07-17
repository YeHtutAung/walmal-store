/** Decorative seed ratings — no backend review system exists (spec decision).
 *  Deterministic per product id so SSG/CSR render identically. */

export interface DecorativeRating {
  stars: 4 | 4.5 | 5
  reviews: number
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

const STAR_STEPS: DecorativeRating['stars'][] = [4, 4.5, 5]

export function decorativeRating(id: string): DecorativeRating {
  const hash = fnv1a(id)
  const stars = STAR_STEPS[hash % 3]
  const reviews = 120 + ((hash >>> 2) % 3281)
  return { stars, reviews }
}

/** `★★★★☆`-style string for the given star count. */
export function starString(stars: DecorativeRating['stars']): string {
  const full = Math.floor(stars)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

/** `1.4k` above 1000, plain number below. */
export function formatReviews(reviews: number): string {
  return reviews >= 1000 ? `${(reviews / 1000).toFixed(1)}k` : String(reviews)
}
