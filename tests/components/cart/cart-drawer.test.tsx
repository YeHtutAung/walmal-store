import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next/image as a plain <img>
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

// Mock @/lib/minio-url to return url unchanged
vi.mock('@/lib/minio-url', () => ({
  resolveMinioUrl: (url: string) => url,
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next/link as a plain <a>
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import { CartDrawer } from '@/components/cart/cart-drawer'
import { useCartStore } from '@/store/cart-store'
import type { CartItem } from '@/types/cart'

const sampleItem: CartItem = {
  variantId: 'v1',
  productName: 'Test Shirt',
  variantName: 'Blue / M',
  price: 2999,
  quantity: 2,
  imageUrl: '/shirt.jpg',
}

function renderDrawer() {
  return render(<CartDrawer open={true} onOpenChange={vi.fn()} />)
}

describe('CartDrawer', () => {
  beforeEach(() => {
    localStorage.clear()
    useCartStore.setState({ items: [] })
  })

  it('shows empty cart message when there are no items', () => {
    renderDrawer()
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument()
  })

  it('renders product details when one item is in the store', () => {
    useCartStore.setState({ items: [sampleItem] })
    renderDrawer()

    expect(screen.getByText('Test Shirt')).toBeInTheDocument()
    expect(screen.getByText('Blue / M')).toBeInTheDocument()
    // quantity rendered in its span
    expect(screen.getByText('2')).toBeInTheDocument()
    // price: formatPrice(2999 * 2) = formatPrice(5998) = $5,998.00
    // CartSummary also shows the subtotal, so there may be multiple matches — use getAllByText
    expect(screen.getAllByText('$5,998.00').length).toBeGreaterThanOrEqual(1)
  })

  it('calls updateQty with qty + 1 when Plus button is clicked', async () => {
    useCartStore.setState({ items: [{ ...sampleItem, quantity: 2 }] })
    const user = userEvent.setup()
    renderDrawer()

    // The quantity controls div contains: Minus button, quantity span, Plus button
    // Find the div with the quantity span and get buttons within it
    const quantitySpan = screen.getByText('2')
    // The parent div of the quantity span contains the Minus and Plus buttons
    const controlsDiv = quantitySpan.parentElement!
    const [, plusBtn] = within(controlsDiv).getAllByRole('button')

    await user.click(plusBtn)

    expect(useCartStore.getState().items[0].quantity).toBe(3)
  })

  it('removes item from cart when Minus is clicked at quantity 1', async () => {
    useCartStore.setState({ items: [{ ...sampleItem, quantity: 1 }] })
    const user = userEvent.setup()
    renderDrawer()

    const quantitySpan = screen.getByText('1')
    const controlsDiv = quantitySpan.parentElement!
    const [minusBtn] = within(controlsDiv).getAllByRole('button')

    await user.click(minusBtn)

    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('"Proceed to checkout" link has href="/checkout"', () => {
    useCartStore.setState({ items: [sampleItem] })
    renderDrawer()

    const link = screen.getByRole('link', { name: /proceed to checkout/i })
    expect(link).toHaveAttribute('href', '/checkout')
  })
})
