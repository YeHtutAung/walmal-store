/** Matches the announcement bar's "Free local delivery over $80" — change both together. */
export const FREE_DELIVERY_THRESHOLD = 80

export function freeDeliveryProgress(subtotal: number): {
  qualifies: boolean
  remaining: number
  pct: number
} {
  const qualifies = subtotal >= FREE_DELIVERY_THRESHOLD
  return {
    qualifies,
    remaining: qualifies ? 0 : Math.round((FREE_DELIVERY_THRESHOLD - subtotal) * 100) / 100,
    // Rounded to one decimal — raw division gives 27.500000000000004 for $22
    // (floating point) and the value only feeds a CSS width.
    pct: Math.round(Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100) * 10) / 10,
  }
}
