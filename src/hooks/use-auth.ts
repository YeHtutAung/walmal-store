import { useAuthStore } from '@/store/auth-store'
import { useCartStore } from '@/store/cart-store'

export function useAuth() {
  const store = useAuthStore()

  function logout() {
    store.logout()
    useCartStore.getState().clearCart()
  }

  return { ...store, logout }
}
