'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, Search } from 'lucide-react'
import { useWishlistStore } from '@/store/wishlist-store'
import { CartIconButton } from './cart-icon-button'
import { CartDrawer } from '@/components/cart/cart-drawer'
import { AnnouncementBar } from './announcement-bar'
import { MobileMenu } from './mobile-menu'
import { NAV_LINKS } from './nav-links'
import { AuthLinks } from './auth-links'

const DESKTOP_NAV_LINKS = NAV_LINKS.filter((link) => !link.mobileOnly)

function SearchForm({ className = '' }: { className?: string }) {
  return (
    <form
      action="/products"
      className={`items-center gap-2.5 rounded-[10px] border border-input bg-secondary px-3.5 py-2.5 transition-colors focus-within:border-[#3a3a42] ${className}`}
    >
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        name="q"
        type="search"
        placeholder="Search jerseys, boots, teams"
        className="w-full bg-transparent text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      <button type="submit" className="sr-only">
        Search
      </button>
    </form>
  )
}

interface SiteHeaderProps {
  /**
   * When provided (e.g. by the (shop) layout, which owns a single shared
   * CartDrawer), the Bag button calls this and the header renders no drawer
   * of its own. When absent the header stays self-contained.
   */
  onOpenCart?: () => void
}

export function SiteHeader({ onOpenCart }: SiteHeaderProps = {}) {
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const showMobileSearch = pathname === '/' || pathname === '/products'

  // Wishlist count comes from a persisted (localStorage) store — render it
  // only after mount so server HTML and first client render match.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const itemCount = useWishlistStore((s) => s.items.length)
  const wishlistCount = mounted ? itemCount : 0

  const heart = (
    <Heart
      className={`h-[18px] w-[18px] ${
        wishlistCount > 0 ? 'fill-primary text-primary' : 'text-muted-foreground'
      }`}
      aria-hidden="true"
    />
  )

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-[1360px] px-4 lg:px-8">
          {/* Desktop row */}
          <div className="hidden h-[68px] items-center gap-[30px] lg:flex">
            <Link href="/" className="display-heading text-[26px] text-foreground">
              WALMAL<span className="text-primary">SPORT</span>
            </Link>

            <nav className="flex items-center gap-6">
              {DESKTOP_NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="label-caps border-b-2 border-transparent pb-0.5 text-[13.5px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <SearchForm className="ml-auto hidden w-full max-w-[320px] md:flex" />

            <div className="flex items-center gap-4">
              <Link
                href="/saved"
                aria-label={`Saved items (${wishlistCount})`}
                className="relative flex h-9 w-9 items-center justify-center"
              >
                {heart}
                {wishlistCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-primary px-0.5 text-[8.5px] font-extrabold leading-none text-white">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <AuthLinks variant="header" />

              <CartIconButton onClick={onOpenCart ?? (() => setCartOpen(true))} />
            </div>
          </div>

          {/* Mobile row */}
          <div className="flex items-center gap-3.5 py-[13px] lg:hidden">
            <button
              type="button"
              aria-label="Menu"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="flex flex-col items-start gap-1 py-1.5"
            >
              <span className="block h-0.5 w-6 rounded bg-foreground" />
              <span className="block h-0.5 w-6 rounded bg-foreground" />
              <span className="block h-0.5 w-[17px] rounded bg-foreground" />
            </button>

            <Link
              href="/"
              className="display-heading flex-1 text-center text-[21px] text-foreground"
            >
              WALMAL<span className="text-primary">SPORT</span>
            </Link>

            <Link
              href="/saved"
              aria-label={`Saved items (${wishlistCount})`}
              className="relative flex h-9 w-9 items-center justify-center"
            >
              {heart}
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-primary px-0.5 text-[8.5px] font-extrabold leading-none text-white">
                  {wishlistCount}
                </span>
              )}
            </Link>
          </div>

          {showMobileSearch && (
            <div className="pb-3 lg:hidden">
              <SearchForm className="flex" />
            </div>
          )}
        </div>
      </header>
      {!onOpenCart && <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />}
      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  )
}
