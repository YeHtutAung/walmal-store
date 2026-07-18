'use client'

import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { useAuthStore, decodePayload } from '@/store/auth-store'
import { useCartStore } from '@/store/cart-store'
import { refreshApi } from '@/lib/api/auth'
import { fetchServerCart, syncServerCart } from '@/lib/api/cart'
import { ApiError } from '@/lib/api/client'

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setToken } = useAuthStore()
  const cartStore = useCartStore()

  useEffect(() => {
    let refreshInterval: ReturnType<typeof setInterval> | null = null

    async function attemptSilentRefresh() {
      const { status } = useAuthStore.getState()
      if (status !== 'idle') return
      // Claim 'loading' synchronously so a React StrictMode double-invocation
      // sees status !== 'idle' and exits early, preventing two concurrent
      // single-use refresh token requests that race and clobber each other.
      useAuthStore.setState({ status: 'loading' })

      try {
        const data = await refreshApi()
        const payload = decodePayload(data.accessToken)
        setToken(data.accessToken, { id: payload.sub, username: payload.username })

        // Proactively refresh every 50 minutes for long-lived sessions
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
        // Only revert to guest if no newer auth operation (e.g. register/login)
        // has already set a different status. Prevents the catch from clobbering
        // a concurrent register() that finished while this refresh was in-flight.
        if (useAuthStore.getState().status === 'loading') {
          useAuthStore.setState({ status: 'guest' })
        }
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
  return (
    <AuthProvider>
      {children}
      <Toaster position="bottom-right" theme="dark" />
    </AuthProvider>
  )
}
