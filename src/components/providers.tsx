'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { useCartStore } from '@/store/cart-store'
import { refreshTokenApi } from '@/lib/api/auth'
import { fetchServerCart, syncServerCart } from '@/lib/api/cart'
import { ApiError } from '@/lib/api/client'

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setToken } = useAuthStore()
  const cartStore = useCartStore()

  useEffect(() => {
    async function attemptSilentRefresh() {
      // Read from store directly — avoid stale closure from first render
      // (persist hydration may update refreshToken after initial render)
      const { refreshToken, status } = useAuthStore.getState()
      if (status !== 'idle') return

      if (!refreshToken) {
        useAuthStore.setState({ status: 'guest' })
        return
      }
      try {
        const data = await refreshTokenApi(refreshToken)
        const payload = JSON.parse(atob(data.accessToken.split('.')[1]))
        setToken(data.accessToken, data.refreshToken, { id: payload.sub, username: payload.username })

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
        useAuthStore.setState({ status: 'guest', refreshToken: null })
      }
    }

    attemptSilentRefresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
