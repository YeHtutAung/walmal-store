import axios, { AxiosError } from 'axios'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10_000,
})

apiClient.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    const { useAuthStore } = await import('@/store/auth-store')
    const token: string | null = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ code?: string; message?: string; errors?: { field: string; message: string }[]; violations?: { field: string; message: string }[] }>) => {
    const status = error.response?.status ?? 0
    const data = error.response?.data
    if (process.env.NODE_ENV === 'development' && status !== 404) console.error('[API error]', status, data)
    const code = data?.code ?? 'UNKNOWN'
    const fieldErrors = (data?.errors ?? data?.violations ?? []).map((e) => `${e.field}: ${e.message}`).join('; ')
    const message = fieldErrors || data?.message || error.message

    if (status === 401 && typeof window !== 'undefined') {
      const { useAuthStore } = await import('@/store/auth-store')
      // Only force-redirect when the user had an active session (token expired mid-session).
      // During 'idle' (silent refresh in progress) a 401 is expected — don't interrupt it.
      if (useAuthStore.getState().status === 'authenticated') {
        const { useCartStore } = await import('@/store/cart-store')
        useAuthStore.getState().logout()
        useCartStore.getState().clearCart()
        const next = window.location.pathname
        window.location.href = `/login?next=${encodeURIComponent(next)}`
      }
    }

    return Promise.reject(new ApiError(status, code, message))
  },
)
