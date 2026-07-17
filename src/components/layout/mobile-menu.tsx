'use client'

import Link from 'next/link'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { NAV_LINKS } from './nav-links'
import { AuthLinks } from './auth-links'

interface MobileMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileMenu({ open, onOpenChange }: MobileMenuProps) {
  const close = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[300px] max-w-[82%] gap-0 border-r border-border bg-[#101013] px-[22px] py-5"
      >
        <SheetTitle className="display-heading text-[22px] font-normal text-foreground">
          WALMAL<span className="text-primary">SPORT</span>
        </SheetTitle>
        <SheetDescription className="sr-only">Site navigation</SheetDescription>

        <nav className="mt-4 flex flex-col">
          {NAV_LINKS.map((item) => (
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
          <AuthLinks variant="menu" onNavigate={close} />
          <a href="#" onClick={close} className="transition-colors hover:text-foreground">
            Help &amp; returns
          </a>
        </div>
      </SheetContent>
    </Sheet>
  )
}
