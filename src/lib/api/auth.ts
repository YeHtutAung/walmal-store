import type { ClientAuthResponse } from '@/types/auth'
import { ApiError } from './client'

async function authFetch(path: string, body?: unknown): Promise<ClientAuthResponse> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(res.status, data?.code ?? 'UNKNOWN', data?.detail ?? data?.message ?? 'Request failed')
  }
  return res.json() as Promise<ClientAuthResponse>
}

export const loginApi = (username: string, password: string) =>
  authFetch('/api/auth/login', { username, password })

export const registerApi = (email: string, password: string, username: string) =>
  authFetch('/api/auth/register', { email, password, username })

export const refreshApi = () => authFetch('/api/auth/refresh')

export async function logoutApi(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' })
}
