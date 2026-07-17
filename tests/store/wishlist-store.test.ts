import { beforeEach, describe, expect, it } from 'vitest'
import { useWishlistStore } from '@/store/wishlist-store'

const item = { productId: 'p1', name: 'Velocity Elite FG Boot', brand: 'Walmal Pro', price: 1199.99, currency: 'USD', imageUrl: '/img.png' }

describe('wishlist store', () => {
  beforeEach(() => useWishlistStore.setState({ items: [] }))

  it('toggles an item in', () => {
    useWishlistStore.getState().toggle(item)
    expect(useWishlistStore.getState().items).toHaveLength(1)
    expect(useWishlistStore.getState().has('p1')).toBe(true)
  })

  it('toggles the same item out', () => {
    useWishlistStore.getState().toggle(item)
    useWishlistStore.getState().toggle(item)
    expect(useWishlistStore.getState().items).toHaveLength(0)
  })

  it('removes by productId', () => {
    useWishlistStore.getState().toggle(item)
    useWishlistStore.getState().remove('p1')
    expect(useWishlistStore.getState().has('p1')).toBe(false)
  })

  it('does not duplicate distinct items', () => {
    useWishlistStore.getState().toggle(item)
    useWishlistStore.getState().toggle({ ...item, productId: 'p2' })
    expect(useWishlistStore.getState().items).toHaveLength(2)
  })
})
