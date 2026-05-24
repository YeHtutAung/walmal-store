import { create } from 'zustand'
import type { CustomerUser } from '@/types/auth'

interface AuthState {
  token: string | null
  user: CustomerUser | null
  status: 'idle' | 'loading' | 'authenticated' | 'guest'
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  setToken: (token: string, user: CustomerUser) => void
}

function decodeRole(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role ?? ''
  } catch {
    return ''
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  user: null,
  status: 'idle',

  login: async (email, password) => {
    set({ status: 'loading' })
    const { loginApi } = await import('@/lib/api/auth')
    const { token, user } = await loginApi(email, password)
    if (decodeRole(token) !== 'CUSTOMER') {
      set({ status: 'guest' })
      throw new Error('This store is for customers only.')
    }
    set({ token, user, status: 'authenticated' })
  },

  register: async (email, password, name) => {
    set({ status: 'loading' })
    const { registerApi } = await import('@/lib/api/auth')
    const { token, user } = await registerApi(email, password, name)
    set({ token, user, status: 'authenticated' })
  },

  logout: () => {
    set({ token: null, user: null, status: 'guest' })
  },

  setToken: (token, user) => set({ token, user, status: 'authenticated' }),
}))
