'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { useCartStore } from '@/store/cart-store'
import { refreshTokenApi } from '@/lib/api/auth'
import { fetchServerCart, syncServerCart } from '@/lib/api/cart'
import { ApiError } from '@/lib/api/client'

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setToken, status } = useAuthStore()
  const cartStore = useCartStore()

  useEffect(() => {
    async function attemptSilentRefresh() {
      try {
        const { accessToken } = await refreshTokenApi()
        const payload = JSON.parse(atob(accessToken.split('.')[1]))
        setToken(accessToken, { id: payload.sub, username: payload.username })

        try {
          const serverItems = await fetchServerCart()
          cartStore.mergeGuestCart(serverItems)
          await syncServerCart(useCartStore.getState().items)
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) {
            // Unexpected cart sync error — ignore silently
          }
        }
      } catch {
        useAuthStore.setState({ status: 'guest' })
      }
    }

    if (status === 'idle') {
      attemptSilentRefresh()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
