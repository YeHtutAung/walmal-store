import { describe, it, expect, beforeEach } from 'vitest'
import type { CartItem } from '@/types/cart'

const item1: CartItem = {
  variantId: 'v1',
  productName: 'Shirt',
  variantName: 'Red / M',
  price: 2999,
  quantity: 1,
  imageUrl: '/shirt.jpg',
}

const item2: CartItem = {
  variantId: 'v2',
  productName: 'Pants',
  variantName: 'Blue / 32',
  price: 4999,
  quantity: 2,
  imageUrl: '/pants.jpg',
}

describe('cart-store', () => {
  beforeEach(async () => {
    localStorage.clear()
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.setState({ items: [] })
  })

  it('starts empty', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('adds a new item', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.getState().addItem(item1)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].variantId).toBe('v1')
  })

  it('increments quantity when same variant added again', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.getState().addItem(item1)
    useCartStore.getState().addItem({ ...item1, quantity: 2 })
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].quantity).toBe(3)
  })

  it('removes an item', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.getState().addItem(item1)
    useCartStore.getState().addItem(item2)
    useCartStore.getState().removeItem('v1')
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].variantId).toBe('v2')
  })

  it('updates quantity', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.getState().addItem(item1)
    useCartStore.getState().updateQty('v1', 5)
    expect(useCartStore.getState().items[0].quantity).toBe(5)
  })

  it('removes item when quantity updated to 0', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.getState().addItem(item1)
    useCartStore.getState().updateQty('v1', 0)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('clears all items', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.getState().addItem(item1)
    useCartStore.getState().addItem(item2)
    useCartStore.getState().clearCart()
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('mergeGuestCart: server wins on quantity conflicts, appends local-only items', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.setState({ items: [{ ...item1, quantity: 3 }, item2] })
    useCartStore.getState().mergeGuestCart([{ ...item1, quantity: 1 }])
    const items = useCartStore.getState().items
    const v1 = items.find(i => i.variantId === 'v1')
    const v2 = items.find(i => i.variantId === 'v2')
    expect(v1?.quantity).toBe(1)
    expect(v2?.quantity).toBe(2)
  })

  it('localStorage rehydration: restores items after simulated page reload', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.setState({ items: [] })
    localStorage.setItem(
      'walmal-cart',
      JSON.stringify({ state: { items: [item1] }, version: 0 }),
    )
    await useCartStore.persist.rehydrate()
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].variantId).toBe('v1')
    localStorage.removeItem('walmal-cart')
  })

  it('mergeGuestCart: preserves local items when server cart is empty', async () => {
    const { useCartStore } = await import('@/store/cart-store')
    useCartStore.setState({ items: [item1, item2] })
    useCartStore.getState().mergeGuestCart([])
    const items = useCartStore.getState().items
    expect(items).toHaveLength(2)
    expect(items.find((i) => i.variantId === 'v1')?.quantity).toBe(1)
    expect(items.find((i) => i.variantId === 'v2')?.quantity).toBe(2)
  })
})
