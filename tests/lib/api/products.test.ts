import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { fetchProducts, fetchProduct } from '@/lib/api/products'
import type { Product } from '@/types/product'

const BASE_URL = 'http://localhost:8080/api/v1'

const mockProduct: Product = {
  productId: 'p1',
  name: 'Test Shirt',
  slug: 'test-shirt',
  brand: 'Walmal',
  lowestPrice: 2999,
  currency: 'USD',
}

const mockPage = {
  data: {
    content: [mockProduct],
    totalElements: 1,
    totalPages: 1,
  },
}

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('fetchProducts', () => {
  it('returns typed ProductListResponse', async () => {
    server.use(
      http.get(`${BASE_URL}/product/search`, () => HttpResponse.json(mockPage)),
    )
    const result = await fetchProducts()
    expect(result.products).toHaveLength(1)
    expect(result.products[0].productId).toBe('p1')
    expect(result.total).toBe(1)
    expect(result.totalPages).toBe(1)
  })

  it('forwards search, page, and size as query params', async () => {
    let capturedUrl = ''
    server.use(
      http.get(`${BASE_URL}/product/search`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(mockPage)
      }),
    )
    await fetchProducts({ search: 'shirt', page: 2, size: 10 })
    const url = new URL(capturedUrl)
    expect(url.searchParams.get('q')).toBe('shirt')
    expect(url.searchParams.get('page')).toBe('1') // fetchProducts does page - 1
    expect(url.searchParams.get('size')).toBe('10')
  })
})

describe('fetchProduct', () => {
  it('returns typed Product', async () => {
    server.use(
      http.get(`${BASE_URL}/product/test-shirt`, () =>
        HttpResponse.json({ data: mockProduct }),
      ),
    )
    const product = await fetchProduct('test-shirt')
    expect(product.productId).toBe('p1')
    expect(product.name).toBe('Test Shirt')
  })

  it('404 → throws ApiError with status 404', async () => {
    server.use(
      http.get(`${BASE_URL}/product/no-such-slug`, () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Product not found' }, { status: 404 }),
      ),
    )
    await expect(fetchProduct('no-such-slug')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
  })
})
