import { describe, it, expect, vi } from 'vitest'
import axios from 'axios'

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
