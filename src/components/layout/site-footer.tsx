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
      {/* Mobile (<md): minimal footer per the mobile wireframe — logo, socials
          row, © only. The link columns and newsletter are md+ only. */}
      <div className="flex flex-col items-center px-4 py-6 md:hidden">
        <Link href="/" className="display-heading text-[19px] text-foreground">
          WALMAL<span className="text-primary">SPORT</span>
        </Link>
        <ul className="mt-3 flex items-center gap-4">
          {SOCIAL_LINKS.map((social) => (
            <li key={social}>
              <Link
                href="#"
                className="text-[12px] text-[#6b6b73] transition-colors hover:text-foreground"
              >
                {social}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11.5px] text-[#4b4b52]">
          © 2026 Walmal Sport. All rights reserved.
        </p>
      </div>

      {/* Desktop (md+): 4-column grid per the desktop wireframe. */}
      <div className="mx-auto hidden max-w-[1360px] px-8 pb-10 pt-[52px] md:block">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1.2fr] gap-10">
          {/* Brand column */}
          <div className="flex max-w-[300px] flex-col items-start gap-4">
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

      <div className="hidden border-t border-border md:block">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between px-8 py-5">
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
