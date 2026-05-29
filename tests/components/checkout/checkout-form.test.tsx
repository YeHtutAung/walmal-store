import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ---------------------------------------------------------------------------
// Static mocks (declared before any dynamic imports)
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/checkout',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useStripe: () => null,
  useElements: () => null,
  PaymentElement: () => <div data-testid="payment-element" />,
  CardElement: () => <div data-testid="card-element" />,
}))

vi.mock('@/lib/api/orders', () => ({
  createOrder: vi.fn(),
  fetchDefaultLocationId: vi.fn(() => Promise.resolve('loc-1')),
}))

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const cartItem = {
  variantId: 'v1',
  productName: 'Shirt',
  variantName: 'Red / M',
  price: 2999,
  quantity: 1,
  imageUrl: '/shirt.jpg',
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function renderCheckoutForm(authStatus: string, items = [cartItem]) {
  vi.resetModules()

  const { useAuthStore } = await import('@/store/auth-store')
  const { useCartStore } = await import('@/store/cart-store')

  useAuthStore.setState({
    status: authStatus as 'idle' | 'loading' | 'authenticated' | 'guest',
    token: authStatus === 'authenticated' ? 'tok' : null,
    user:
      authStatus === 'authenticated'
        ? { id: '1', username: 'alice' }
        : null,
  } as Parameters<typeof useAuthStore.setState>[0])

  useCartStore.setState({ items } as Parameters<typeof useCartStore.setState>[0])

  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ clientSecret: 'pi_test_secret' }),
        ok: true,
      }),
    ),
  )

  const { CheckoutForm } = await import('@/components/checkout/checkout-form')
  return render(<CheckoutForm />)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CheckoutForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('No JWT → guest-vs-login choice rendered', async () => {
    await renderCheckoutForm('guest')
    expect(
      screen.getByText('How would you like to check out?'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /continue as guest/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in \/ register/i })).toBeInTheDocument()
  })

  it('JWT in store → choice skipped, shipping details shown', async () => {
    await renderCheckoutForm('authenticated')
    await waitFor(() => {
      expect(screen.getByText('Shipping details')).toBeInTheDocument()
    })
    expect(
      screen.queryByText('How would you like to check out?'),
    ).not.toBeInTheDocument()
  })

  it('Guest form submitted empty → email input is invalid', async () => {
    const user = userEvent.setup()
    await renderCheckoutForm('guest')

    await user.click(screen.getByRole('button', { name: /continue as guest/i }))

    const emailInput = await screen.findByPlaceholderText('your@email.com')
    // An empty required email input is always :invalid per HTML5
    expect(emailInput).toBeRequired()
    expect(emailInput).toBeInvalid()
  })

  it('Guest form submitted invalid email → email input invalid', async () => {
    const user = userEvent.setup()
    await renderCheckoutForm('guest')

    await user.click(screen.getByRole('button', { name: /continue as guest/i }))

    const emailInput = await screen.findByPlaceholderText('your@email.com')
    await user.type(emailInput, 'not-an-email')

    // type="email" with a non-email value makes validity.typeMismatch = true
    expect(emailInput).toBeInvalid()
  })

  it('Sign in / Register link has href="/login?next=/checkout"', async () => {
    await renderCheckoutForm('guest')

    const link = screen.getByRole('link', { name: /sign in \/ register/i })
    expect(link).toHaveAttribute('href', '/login?next=/checkout')
  })
})
