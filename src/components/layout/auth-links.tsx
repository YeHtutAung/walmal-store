'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'

// E2E contract — texts/hrefs must not change: guest → "Sign in" (/login) +
// "Register" (/register); authenticated → "Hi, {username}" (/account) +
// "Sign out" button calling logout. Restyle freely; never rename.
const HEADER_LINK_CLASS =
  'font-label whitespace-nowrap text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground'
const HEADER_REGISTER_CLASS =
  'font-label rounded-[10px] border border-border px-3.5 py-2 text-[13px] font-semibold text-foreground transition-colors hover:border-primary'
const MENU_LINK_CLASS = 'transition-colors hover:text-foreground'

interface AuthLinksProps {
  /** 'header' = desktop SiteHeader styling, 'menu' = MobileMenu sheet styling. */
  variant: 'header' | 'menu'
  /** Called on every link click / before logout — used by MobileMenu to close the sheet. */
  onNavigate?: () => void
}

export function AuthLinks({ variant, onNavigate }: AuthLinksProps) {
  const { status, user, logout } = useAuth()
  const isAuthenticated = status === 'authenticated'
  const linkClass = variant === 'header' ? HEADER_LINK_CLASS : MENU_LINK_CLASS

  function handleLogout() {
    onNavigate?.()
    logout()
  }

  if (isAuthenticated) {
    return (
      <>
        <Link href="/account" onClick={onNavigate} className={linkClass}>
          Hi, {user?.username}
        </Link>
        <button type="button" onClick={handleLogout} className={linkClass}>
          Sign out
        </button>
      </>
    )
  }

  return (
    <>
      <Link href="/login" onClick={onNavigate} className={linkClass}>
        Sign in
      </Link>
      <Link
        href="/register"
        onClick={onNavigate}
        className={variant === 'header' ? HEADER_REGISTER_CLASS : linkClass}
      >
        Register
      </Link>
    </>
  )
}
