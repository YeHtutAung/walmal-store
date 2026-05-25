import { create } from 'zustand'
import type { CustomerUser } from '@/types/auth'

interface AuthState {
  token: string | null
  user: CustomerUser | null
  status: 'idle' | 'loading' | 'authenticated' | 'guest'
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  logout: () => void
  setToken: (token: string, user: CustomerUser) => void
}

function decodePayload(token: string): Record<string, string> {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return {}
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  user: null,
  status: 'idle',

  login: async (username, password) => {
    set({ status: 'loading' })
    const { loginApi } = await import('@/lib/api/auth')
    const { accessToken } = await loginApi(username, password)
    const payload = decodePayload(accessToken)
    if (payload.role !== 'CUSTOMER') {
      set({ status: 'guest' })
      throw new Error('This store is for customers only.')
    }
    set({ token: accessToken, user: { id: payload.sub, username: payload.username }, status: 'authenticated' })
  },

  register: async (email, password, username) => {
    set({ status: 'loading' })
    const { registerApi } = await import('@/lib/api/auth')
    const { accessToken } = await registerApi(email, password, username)
    const payload = decodePayload(accessToken)
    set({ token: accessToken, user: { id: payload.sub, username: payload.username }, status: 'authenticated' })
  },

  logout: () => {
    set({ token: null, user: null, status: 'guest' })
  },

  setToken: (token, user) => set({ token, user, status: 'authenticated' }),
}))
