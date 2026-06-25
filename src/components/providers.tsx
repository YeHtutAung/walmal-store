'use client'

import { useEffect } from 'react'
import { useAuthStore, decodePayload } from '@/store/auth-store'
import { useCartStore } from '@/store/cart-store'
import { refreshTokenApi } from '@/lib/api/auth'
import { fetchServerCart, syncServerCart } from '@/lib/api/cart'
import { ApiError } from '@/lib/api/client'

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setToken } = useAuthStore()
  const cartStore = useCartStore()

  useEffect(() => {
    let refreshInterval: ReturnType<typeof setInterval> | null = null

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
        const payload = decodePayload(data.accessToken)
        setToken(data.accessToken, data.refreshToken, { id: payload.sub, username: payload.username })

        // Proactively refresh token every 50 minutes so long-lived sessions stay valid
        refreshInterval = setInterval(() => {
          if (useAuthStore.getState().status === 'authenticated') {
            useAuthStore.getState().refresh()
          }
        }, 50 * 60 * 1000)

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

    return () => {
      if (refreshInterval) clearInterval(refreshInterval)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
