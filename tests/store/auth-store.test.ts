import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/auth', () => ({
  loginApi: vi.fn(),
  registerApi: vi.fn(),
  refreshTokenApi: vi.fn(),
}))

vi.mock('@/store/cart-store', () => ({
  useCartStore: { getState: vi.fn(() => ({ clearCart: vi.fn() })) },
}))

// JWT with role=CUSTOMER, sub=1, username=alice
const CUSTOMER_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQ1VTVE9NRVIiLCJzdWIiOiIxIiwidXNlcm5hbWUiOiJhbGljZSJ9.sig'
// JWT with role=ADMIN
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQURNSU4iLCJzdWIiOiIyIiwidXNlcm5hbWUiOiJhZG1pbiJ9.sig'

const makeAuthResponse = (accessToken: string) => ({
  accessToken,
  refreshToken: 'refresh-tok',
  tokenType: 'Bearer',
  expiresIn: 900,
  role: 'CUSTOMER',
})

describe('auth-store', () => {
  beforeEach(async () => {
    vi.resetModules()
    const { useAuthStore } = await import('@/store/auth-store')
    useAuthStore.setState({ token: null, user: null, status: 'idle' })
  })

  it('starts with idle status and no token', async () => {
    const { useAuthStore } = await import('@/store/auth-store')
    const { token, user, status } = useAuthStore.getState()
    expect(token).toBeNull()
    expect(user).toBeNull()
    expect(status).toBe('idle')
  })

  it('sets authenticated state on successful login', async () => {
    const { loginApi } = await import('@/lib/api/auth')
    vi.mocked(loginApi).mockResolvedValueOnce(makeAuthResponse(CUSTOMER_TOKEN))
    const { useAuthStore } = await import('@/store/auth-store')
    await useAuthStore.getState().login('alice', 'pass')
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().user?.username).toBe('alice')
  })

  it('rejects non-CUSTOMER role tokens', async () => {
    const { loginApi } = await import('@/lib/api/auth')
    vi.mocked(loginApi).mockResolvedValueOnce(makeAuthResponse(ADMIN_TOKEN))
    const { useAuthStore } = await import('@/store/auth-store')
    await expect(useAuthStore.getState().login('admin', 'pass')).rejects.toThrow(
      'This store is for customers only.'
    )
    expect(useAuthStore.getState().status).toBe('guest')
  })

  it('clears token and user on logout', async () => {
    const { useAuthStore } = await import('@/store/auth-store')
    useAuthStore.setState({
      token: 'tok',
      user: { id: '1', username: 'alice' },
      status: 'authenticated',
    })
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().status).toBe('guest')
  })
})
