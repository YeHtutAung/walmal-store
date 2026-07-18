import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse, delay } from 'msw'

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios')
  return {
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })),
    },
  }
})

describe('ApiError', () => {
  it('stores status, code, and message', async () => {
    const { ApiError } = await import('@/lib/api/client')
    const err = new ApiError(404, 'NOT_FOUND', 'Resource not found')
    expect(err.status).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.message).toBe('Resource not found')
    expect(err).toBeInstanceOf(Error)
  })
})

const BASE_URL = 'http://localhost:8080/api/v1'

describe('apiClient interceptors', () => {
  const server = setupServer()

  // Shared mutable state controlled per-test
  let mockToken: string | null = null
  let mockStatus: string = 'guest'
  const mockLogout = vi.fn()
  const mockClearCart = vi.fn()
  let originalLocationDescriptor: PropertyDescriptor | undefined

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
  afterEach(() => {
    server.resetHandlers()
    mockToken = null
    mockStatus = 'guest'
    mockLogout.mockReset()
    mockClearCart.mockReset()
    if (originalLocationDescriptor) {
      Object.defineProperty(window, 'location', originalLocationDescriptor)
      originalLocationDescriptor = undefined
    }
  })
  afterAll(() => server.close())

  async function freshClient() {
    vi.doMock('@/store/auth-store', () => ({
      useAuthStore: {
        getState: () => ({
          token: mockToken,
          status: mockStatus,
          logout: () => {
            mockStatus = 'guest'
            mockToken = null
            mockLogout()
          },
        }),
        setState: (patch: { token?: string | null; status?: string }) => {
          if ('token' in patch) mockToken = patch.token ?? null
          if ('status' in patch) mockStatus = patch.status ?? mockStatus
        },
      },
    }))
    vi.doMock('@/store/cart-store', () => ({
      useCartStore: {
        getState: () => ({ clearCart: mockClearCart }),
      },
    }))
    vi.doUnmock('axios')
    vi.resetModules()
    const { apiClient } = await import('@/lib/api/client')
    return apiClient
  }

  it('attaches Authorization header when token exists', async () => {
    let capturedAuth: string | null = null
    server.use(
      http.get(`${BASE_URL}/products`, ({ request }) => {
        capturedAuth = request.headers.get('Authorization')
        return HttpResponse.json({})
      }),
    )

    mockToken = 'test-token'
    mockStatus = 'authenticated'
    const client = await freshClient()

    await client.get('/products').catch(() => {})
    expect(capturedAuth).toBe('Bearer test-token')
  })

  it('omits Authorization header when guest (token null)', async () => {
    let capturedAuth: string | null | undefined = undefined
    server.use(
      http.get(`${BASE_URL}/products`, ({ request }) => {
        capturedAuth = request.headers.get('Authorization')
        return HttpResponse.json({})
      }),
    )

    mockToken = null
    mockStatus = 'guest'
    const client = await freshClient()

    await client.get('/products').catch(() => {})
    expect(capturedAuth).toBeNull()
  })

  it('401 response → logout called and location set to /login', async () => {
    server.use(
      http.get(`${BASE_URL}/protected`, () =>
        HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 }),
      ),
    )

    originalLocationDescriptor = Object.getOwnPropertyDescriptor(window, 'location')
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost/protected', pathname: '/protected' },
      writable: true,
      configurable: true,
    })

    mockToken = 'tok'
    mockStatus = 'authenticated'
    const client = await freshClient()

    await client.get('/protected').catch(() => {})

    expect(mockStatus).toBe('guest')
    expect(mockLogout).toHaveBeenCalledOnce()
    expect(window.location.href).toMatch(/\/login\?next=/)
  })

  it('timeout → throws ApiError', async () => {
    server.use(
      http.get(`${BASE_URL}/slow`, async () => {
        await delay(60_000)
        return HttpResponse.json({})
      }),
    )

    vi.useFakeTimers()
    const client = await freshClient()
    client.defaults.timeout = 100
    // Use fetch adapter so that the timeout is driven by a plain setTimeout
    // (the XHR adapter in jsdom+MSW cannot fire the timeout event because
    //  MSW intercepts before jsdom's XHR send() sets up the timer).
    client.defaults.adapter = 'fetch'
    const { ApiError: Err } = await import('@/lib/api/client')

    const requestPromise = client.get('/slow')
    const assertion = expect(requestPromise).rejects.toBeInstanceOf(Err)
    await vi.advanceTimersByTimeAsync(200)
    await assertion
    vi.useRealTimers()
  }, 10_000)
})
