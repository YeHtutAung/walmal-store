import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CustomerUser } from '@/types/auth'

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: CustomerUser | null
  status: 'idle' | 'loading' | 'authenticated' | 'guest'
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  refresh: () => Promise<void>
  logout: () => void
  setToken: (token: string, refreshToken: string, user: CustomerUser) => void
}

function decodePayload(token: string): Record<string, string> {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return {}
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      status: 'idle',

      login: async (username, password) => {
        set({ status: 'loading' })
        try {
          const { loginApi } = await import('@/lib/api/auth')
          const { accessToken, refreshToken } = await loginApi(username, password)
          const payload = decodePayload(accessToken)
          if (payload.role !== 'CUSTOMER') {
            set({ status: 'guest' })
            throw new Error('This store is for customers only.')
          }
          set({
            token: accessToken,
            refreshToken,
            user: { id: payload.sub, username: payload.username },
            status: 'authenticated',
          })
        } catch (e) {
          const current = get().status
          if (current !== 'guest') set({ status: 'guest' })
          throw e
        }
      },

      register: async (email, password, username) => {
        set({ status: 'loading' })
        const { registerApi } = await import('@/lib/api/auth')
        const { accessToken, refreshToken } = await registerApi(email, password, username)
        const payload = decodePayload(accessToken)
        set({
          token: accessToken,
          refreshToken,
          user: { id: payload.sub, username: payload.username },
          status: 'authenticated',
        })
      },

      refresh: async () => {
        const storedRefresh = get().refreshToken
        if (!storedRefresh) return
        try {
          const { refreshTokenApi } = await import('@/lib/api/auth')
          const { accessToken, refreshToken: newRefreshToken } = await refreshTokenApi(storedRefresh)
          const payload = decodePayload(accessToken)
          set({
            token: accessToken,
            refreshToken: newRefreshToken,
            user: { id: payload.sub, username: payload.username },
            status: 'authenticated',
          })
        } catch {
          set({ status: 'guest' })
        }
      },

      logout: () => {
        set({ token: null, refreshToken: null, user: null, status: 'guest' })
      },

      setToken: (token, refreshToken, user) =>
        set({ token, refreshToken, user, status: 'authenticated' }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    },
  ),
)
