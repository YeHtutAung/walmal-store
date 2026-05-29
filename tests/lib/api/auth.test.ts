import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { loginApi, registerApi } from '@/lib/api/auth'
import type { AuthResponse } from '@/types/auth'

const BASE_URL = 'http://localhost:8080/api/v1'

// JWT payload {"role":"CUSTOMER","sub":"1","username":"alice"}
const CUSTOMER_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQ1VTVE9NRVIiLCJzdWIiOiIxIiwidXNlcm5hbWUiOiJhbGljZSJ9.sig'

const mockAuthResponse: AuthResponse = {
  accessToken: CUSTOMER_TOKEN,
  refreshToken: 'ref-tok',
  tokenType: 'Bearer',
  expiresIn: 900,
  role: 'CUSTOMER',
}

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('loginApi', () => {
  it('resolves with token and user data', async () => {
    server.use(
      http.post(`${BASE_URL}/auth/login`, () => HttpResponse.json(mockAuthResponse)),
    )
    const result = await loginApi('alice', 'password')
    expect(result.accessToken).toBe(CUSTOMER_TOKEN)
    expect(result.refreshToken).toBe('ref-tok')
    expect(result.tokenType).toBe('Bearer')
  })
})

describe('registerApi', () => {
  it('resolves with token and user data', async () => {
    server.use(
      http.post(`${BASE_URL}/auth/register`, () => HttpResponse.json(mockAuthResponse)),
    )
    const result = await registerApi('alice@example.com', 'pass', 'alice')
    expect(result.accessToken).toBe(CUSTOMER_TOKEN)
    expect(result.refreshToken).toBe('ref-tok')
  })

  it('409 email taken → throws ApiError with code EMAIL_TAKEN', async () => {
    server.use(
      http.post(`${BASE_URL}/auth/register`, () =>
        HttpResponse.json(
          { code: 'EMAIL_TAKEN', message: 'Email already in use' },
          { status: 409 },
        ),
      ),
    )
    await expect(registerApi('taken@example.com', 'pass', 'taken')).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
    })
  })
})
