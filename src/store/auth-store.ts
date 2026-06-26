import { create } from 'zustand'
import type { CustomerUser } from '@/types/auth'

interface AuthState {
  token: string | null
  user: CustomerUser | null
  status: 'idle' | 'loading' | 'authenticated' | 'guest'
  login: (username: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  refresh: () => Promise<void>
  logout: () => void
  setToken: (token: string, user: CustomerUser) => void
}

function setAuthCookie(authenticated: boolean) {
  if (typeof document === 'undefined') return
  document.cookie = authenticated
    ? 'walmal-auth=1; SameSite=Strict; Path=/'
    : 'walmal-auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; Path=/'
}

export function decodePayload(token: string): Record<string, string> {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return {}
  }
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: null,
  user: null,
  status: 'idle',

  login: async (username, password) => {
    set({ status: 'loading' })
    try {
      const { loginApi } = await import('@/lib/api/auth')
      const { accessToken } = await loginApi(username, password)
      const payload = decodePayload(accessToken)
      if (payload.role !== 'CUSTOMER') {
        set({ status: 'guest' })
        throw new Error('This store is for customers only.')
      }
      set({ token: accessToken, user: { id: payload.sub, username: payload.username }, status: 'authenticated' })
      setAuthCookie(true)
    } catch (e) {
      if (get().status !== 'guest') set({ status: 'guest' })
      throw e
    }
  },

  register: async (email, password, username) => {
    set({ status: 'loading' })
    try {
      const { registerApi } = await import('@/lib/api/auth')
      const { accessToken } = await registerApi(email, password, username)
      const payload = decodePayload(accessToken)
      set({ token: accessToken, user: { id: payload.sub, username: payload.username }, status: 'authenticated' })
      setAuthCookie(true)
    } catch (e) {
      set({ status: 'guest' })
      throw e
    }
  },

  refresh: async () => {
    // Skip if the access token still has more than 5 minutes remaining
    const currentToken = get().token
    if (currentToken) {
      const payload = decodePayload(currentToken)
      const exp = Number(payload.exp)
      if (exp && exp * 1000 - Date.now() > 5 * 60 * 1000) return
    }
    try {
      const { refreshApi } = await import('@/lib/api/auth')
      const { accessToken } = await refreshApi()
      const payload = decodePayload(accessToken)
      set({ token: accessToken, user: { id: payload.sub, username: payload.username }, status: 'authenticated' })
    } catch {
      set({ status: 'guest' })
    }
  },

  logout: () => {
    set({ token: null, user: null, status: 'guest' })
    setAuthCookie(false)
    // Fire-and-forget: clear the httpOnly walmal-rt cookie server-side
    import('@/lib/api/auth').then(({ logoutApi }) => logoutApi()).catch(() => {})
  },

  setToken: (token, user) => {
    set({ token, user, status: 'authenticated' })
    setAuthCookie(true)
  },
}))
