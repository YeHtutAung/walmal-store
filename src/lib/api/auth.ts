import { apiClient } from './client'
import type { AuthResponse } from '@/types/auth'

export async function loginApi(username: string, password: string): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/login', { username, password })
  return res.data
}

export async function registerApi(
  email: string,
  password: string,
  username: string,
): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/register', { email, password, username })
  return res.data
}

export async function refreshTokenApi(): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/refresh')
  return res.data
}
