import { apiClient } from './client'
import type { AuthResponse } from '@/types/auth'

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/login', { email, password })
  return res.data
}

export async function registerApi(
  email: string,
  password: string,
  name: string,
): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/register', { email, password, name })
  return res.data
}

export async function refreshTokenApi(): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/refresh')
  return res.data
}
