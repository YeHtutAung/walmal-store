'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

const NAV_ITEMS = [
  { label: 'Shop All', href: '/products' },
  { label: 'Jerseys', href: '/products?category=jerseys' },
  { label: 'Boots', href: '/products?category=boots' },
  { label: 'Teamwear', href: '/products?category=teamwear' },
  { label: 'Equipment', href: '/products?category=equipment' },
  { label: 'Saved', href: '/saved' },
]

interface MobileMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileMenu({ open, onOpenChange }: MobileMenuProps) {
  const { status, user, logout } = useAuth()
  const isAuthenticated = status === 'authenticated'
  const close = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        aria-describedby={undefined}
        className="w-[300px] max-w-[82%] gap-0 border-r border-border bg-[#101013] px-[22px] py-5"
      >
        <SheetTitle className="display-heading text-[22px] font-normal text-foreground">
          WALMAL<span className="text-primary">SPORT</span>
        </SheetTitle>

        <nav className="mt-4 flex flex-col">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={close}
              className="display-heading border-b border-[#1a1a1e] py-[13px] text-[26px] text-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col items-start gap-3 font-label text-[13px] font-semibold text-muted-foreground">
          {isAuthenticated ? (
            <>
              <Link href="/account" onClick={close} className="transition-colors hover:text-foreground">
                Hi, {user?.username}
              </Link>
              <button
                type="button"
                onClick={() => {
                  close()
                  logout()
                }}
                className="transition-colors hover:text-foreground"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={close} className="transition-colors hover:text-foreground">
                Sign in
              </Link>
              <Link href="/register" onClick={close} className="transition-colors hover:text-foreground">
                Register
              </Link>
            </>
          )}
          <a href="#" onClick={close} className="transition-colors hover:text-foreground">
            Help &amp; returns
          </a>
        </div>
      </SheetContent>
    </Sheet>
  )
}
