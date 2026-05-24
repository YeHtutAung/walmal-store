import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/types/cart'

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (variantId: string) => void
  updateQty: (variantId: string, qty: number) => void
  clearCart: () => void
  mergeGuestCart: (serverItems: CartItem[]) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (incoming) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === incoming.variantId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === incoming.variantId
                  ? { ...i, quantity: i.quantity + incoming.quantity }
                  : i,
              ),
            }
          }
          return { items: [...state.items, incoming] }
        }),

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),

      updateQty: (variantId, qty) => {
        if (qty <= 0) {
          get().removeItem(variantId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, quantity: qty } : i,
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      mergeGuestCart: (serverItems) =>
        set((state) => {
          const merged = [...serverItems]
          for (const local of state.items) {
            if (!merged.find((s) => s.variantId === local.variantId)) {
              merged.push(local)
            }
          }
          return { items: merged }
        }),
    }),
    { name: 'walmal-cart' },
  ),
)
