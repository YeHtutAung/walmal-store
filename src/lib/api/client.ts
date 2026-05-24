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

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const { useAuthStore } = require('@/store/auth-store')
    const token: string | null = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ code?: string; message?: string }>) => {
    const status = error.response?.status ?? 0
    const code = error.response?.data?.code ?? 'UNKNOWN'
    const message = error.response?.data?.message ?? error.message

    if (status === 401 && typeof window !== 'undefined') {
      const { useAuthStore } = require('@/store/auth-store')
      const { useCartStore } = require('@/store/cart-store')
      useAuthStore.getState().logout()
      useCartStore.getState().clearCart()
      const next = window.location.pathname
      window.location.href = `/login?next=${encodeURIComponent(next)}`
    }

    return Promise.reject(new ApiError(status, code, message))
  },
)
