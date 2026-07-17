// Single source of truth for the category/nav link list shared by the
// desktop SiteHeader nav and the MobileMenu sheet. `mobileOnly` items (e.g.
// Saved) render in the mobile sheet but are filtered out of the desktop nav.
export interface NavLink {
  label: string
  href: string
  mobileOnly?: boolean
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Shop All', href: '/products' },
  { label: 'Jerseys', href: '/products?category=jerseys' },
  { label: 'Boots', href: '/products?category=boots' },
  { label: 'Teamwear', href: '/products?category=teamwear' },
  { label: 'Equipment', href: '/products?category=equipment' },
  { label: 'Saved', href: '/saved', mobileOnly: true },
]
