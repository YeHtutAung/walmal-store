import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/auth', () => ({
  loginApi: vi.fn(),
  registerApi: vi.fn(),
  refreshApi: vi.fn(),
}))

vi.mock('@/store/cart-store', () => ({
  useCartStore: { getState: vi.fn(() => ({ clearCart: vi.fn() })) },
}))

// JWT with role=CUSTOMER, sub=1, username=alice
const CUSTOMER_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQ1VTVE9NRVIiLCJzdWIiOiIxIiwidXNlcm5hbWUiOiJhbGljZSJ9.sig'
// JWT with role=ADMIN
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQURNSU4iLCJzdWIiOiIyIiwidXNlcm5hbWUiOiJhZG1pbiJ9.sig'
const STAFF_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiU1RBRkYiLCJzdWIiOiIzIiwidXNlcm5hbWUiOiJzdGFmZiJ9.sig'

const makeAuthResponse = (accessToken: string) => ({
  accessToken,
  tokenType: 'Bearer',
  expiresIn: 900,
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

  it('login failure: wrong credentials → status guest, token null', async () => {
    const { loginApi } = await import('@/lib/api/auth')
    const { ApiError } = await import('@/lib/api/client')
    vi.mocked(loginApi).mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Bad credentials'))
    const { useAuthStore } = await import('@/store/auth-store')
    await expect(useAuthStore.getState().login('alice', 'wrong')).rejects.toThrow()
    expect(useAuthStore.getState().status).toBe('guest')
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('STAFF role rejected: throws and status becomes guest', async () => {
    const { loginApi } = await import('@/lib/api/auth')
    vi.mocked(loginApi).mockResolvedValueOnce(makeAuthResponse(STAFF_TOKEN))
    const { useAuthStore } = await import('@/store/auth-store')
    await expect(useAuthStore.getState().login('staff', 'pass')).rejects.toThrow(
      'This store is for customers only.',
    )
    expect(useAuthStore.getState().status).toBe('guest')
  })

  it('silent refresh success: status becomes authenticated with new token', async () => {
    const { refreshApi } = await import('@/lib/api/auth')
    vi.mocked(refreshApi).mockResolvedValueOnce(makeAuthResponse(CUSTOMER_TOKEN))
    const { useAuthStore } = await import('@/store/auth-store')
    useAuthStore.setState({ status: 'idle' })
    await useAuthStore.getState().refresh()
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().token).toBe(CUSTOMER_TOKEN)
  })

  it('silent refresh 401: status becomes guest, does not throw', async () => {
    const { refreshApi } = await import('@/lib/api/auth')
    const { ApiError } = await import('@/lib/api/client')
    vi.mocked(refreshApi).mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Token expired'))
    const { useAuthStore } = await import('@/store/auth-store')
    useAuthStore.setState({ status: 'idle' })
    await expect(useAuthStore.getState().refresh()).resolves.toBeUndefined()
    expect(useAuthStore.getState().status).toBe('guest')
  })
})
