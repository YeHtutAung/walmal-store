import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace, push: vi.fn() })),
  usePathname: vi.fn(() => '/account'),
}))

async function renderLayout(status: string) {
  vi.resetModules()
  const { useAuthStore } = await import('@/store/auth-store')
  useAuthStore.setState({ status: status as any } as any)
  const AccountLayout = (await import('@/app/(account)/layout')).default
  return render(
    <AccountLayout>
      <div data-testid="child">account content</div>
    </AccountLayout>,
  )
}

describe('AccountLayout', () => {
  beforeEach(() => {
    mockReplace.mockReset()
  })

  it('status loading → spinner rendered, no redirect', async () => {
    await renderLayout('loading')
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('status authenticated → children rendered', async () => {
    await renderLayout('authenticated')
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('status guest → router.replace /login?next=/account called', async () => {
    await renderLayout('guest')
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login?next=%2Faccount')
    })
  })

  it('status idle → spinner rendered, no redirect', async () => {
    await renderLayout('idle')
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
