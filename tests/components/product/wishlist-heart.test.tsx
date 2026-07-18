import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { WishlistHeart } from '@/components/product/wishlist-heart'
import { useWishlistStore } from '@/store/wishlist-store'
import type { Product } from '@/types/product'

const product: Product = {
  productId: 'p1',
  name: 'Velocity Elite FG Boot',
  slug: 'velocity-elite-fg-boot',
  brand: 'Walmal Pro',
  lowestPrice: 1199.99,
  currency: 'USD',
  primaryImageUrl: '/img/boot.png',
}

beforeEach(() => useWishlistStore.setState({ items: [] }))

describe('WishlistHeart', () => {
  it('toggles the product into the store with the mapped fields', async () => {
    render(<WishlistHeart product={product} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save Velocity Elite FG Boot' }))
    const items = useWishlistStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({
      productId: 'p1',
      name: 'Velocity Elite FG Boot',
      brand: 'Walmal Pro',
      price: 1199.99,
      currency: 'USD',
      imageUrl: '/img/boot.png',
    })
  })

  it('reflects saved state via aria-pressed and toggles back out', async () => {
    render(<WishlistHeart product={product} />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Remove Velocity Elite FG Boot from saved' })).toBe(btn)
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    expect(useWishlistStore.getState().items).toHaveLength(0)
  })
})
