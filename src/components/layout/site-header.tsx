'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { CartIconButton } from './cart-icon-button'
import { Button } from '@/components/ui/button'

export function SiteHeader() {
  const { status, user, logout } = useAuth()
  const isAuthenticated = status === 'authenticated'

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Walmal
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/products" className="text-muted-foreground transition-colors hover:text-foreground">
            Products
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <CartIconButton />
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/account">Hi, {user?.name.split(' ')[0]}</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
