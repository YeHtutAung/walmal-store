import { useCartStore } from '@/store/cart-store'
import { formatPrice } from '@/lib/utils'

export function useCart() {
  const store = useCartStore()

  const itemCount = store.items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = store.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const subtotalFormatted = formatPrice(subtotal)

  return { ...store, itemCount, subtotal, subtotalFormatted }
}
