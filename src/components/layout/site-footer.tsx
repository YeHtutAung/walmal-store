import Link from 'next/link'
import { NAV_LINKS } from './nav-links'
import { NewsletterForm } from './newsletter-form'

// Shop links derived from the shared NAV_LINKS list (Jerseys/Boots/Teamwear/
// Equipment), minus "Shop All" (the desktop nav's catch-all), plus a
// footer-only "Sale" entry that reuses the same unfiltered /products route.
const SHOP_LINKS = [
  ...NAV_LINKS.filter((link) => !link.mobileOnly && link.href !== '/products'),
  { label: 'Sale', href: '/products' },
]

const HELP_LINKS = [
  { label: 'Track order', href: '/account' },
  { label: 'Returns', href: '#' },
  { label: 'Size guide', href: '#' },
  { label: 'Contact us', href: '#' },
]

const STORES = ['Flagship — Downtown', 'Riverside Mall', 'Airport Terminal', 'Stadium Pop-up']

const SOCIAL_LINKS = ['Instagram', 'Facebook', 'TikTok']

function FooterLinkColumn({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <div>
      <h3 className="label-caps text-[12px] text-foreground">{title}</h3>
      <ul className="mt-4 flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-[13.5px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-[1360px] px-4 py-10 md:px-8 md:py-[52px]">
        <div className="grid grid-cols-1 gap-10 text-center md:grid-cols-[1.5fr_1fr_1fr_1.2fr] md:text-left">
          {/* Brand column */}
          <div className="flex flex-col items-center gap-4 md:max-w-[300px] md:items-start">
            <Link href="/" className="display-heading text-[24px] text-foreground">
              WALMAL<span className="text-primary">SPORT</span>
            </Link>
            <p className="text-[13.5px] text-muted-foreground">
              Kit up. Play more. Get match-day drops and 10% off your first order.
            </p>
            <NewsletterForm />
          </div>

          <FooterLinkColumn title="Shop" links={SHOP_LINKS} />
          <FooterLinkColumn title="Help" links={HELP_LINKS} />

          {/* Stores column — static text, not links (no store-locator page). */}
          <div>
            <h3 className="label-caps text-[12px] text-foreground">Stores</h3>
            <ul className="mt-4 flex flex-col gap-3">
              {STORES.map((store) => (
                <li key={store} className="text-[13.5px] text-muted-foreground">
                  {store}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1360px] flex-col-reverse items-center gap-3 px-4 py-5 md:flex-row md:justify-between md:px-8">
          <p className="text-[12.5px] text-[#6b6b73]">
            © 2026 Walmal Sport. All rights reserved.
          </p>
          <ul className="flex items-center gap-4">
            {SOCIAL_LINKS.map((social) => (
              <li key={social}>
                <Link
                  href="#"
                  className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {social}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
