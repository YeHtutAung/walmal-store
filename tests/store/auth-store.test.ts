import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/auth', () => ({
  loginApi: vi.fn(),
  registerApi: vi.fn(),
  refreshTokenApi: vi.fn(),
}))

vi.mock('@/store/cart-store', () => ({
  useCartStore: { getState: vi.fn(() => ({ clearCart: vi.fn() })) },
}))

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
    vi.mocked(loginApi).mockResolvedValueOnce({
      token: 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQ1VTVE9NRVIiLCJzdWIiOiIxIn0.sig',
      user: { id: '1', email: 'a@b.com', name: 'Alice' },
    })
    const { useAuthStore } = await import('@/store/auth-store')
    await useAuthStore.getState().login('a@b.com', 'pass')
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().user?.email).toBe('a@b.com')
  })

  it('rejects non-CUSTOMER role tokens', async () => {
    const { loginApi } = await import('@/lib/api/auth')
    vi.mocked(loginApi).mockResolvedValueOnce({
      token: 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQURNSU4ifQ.sig',
      user: { id: '2', email: 'admin@b.com', name: 'Admin' },
    })
    const { useAuthStore } = await import('@/store/auth-store')
    await expect(useAuthStore.getState().login('admin@b.com', 'pass')).rejects.toThrow(
      'This store is for customers only.'
    )
    expect(useAuthStore.getState().status).toBe('guest')
  })

  it('clears token and user on logout', async () => {
    const { useAuthStore } = await import('@/store/auth-store')
    useAuthStore.setState({
      token: 'tok',
      user: { id: '1', email: 'a@b.com', name: 'Alice' },
      status: 'authenticated',
    })
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().status).toBe('guest')
  })
})
