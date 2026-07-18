'use client'

import Link from 'next/link'

// Slugs are coupled to the V17 seeded taxonomy (see docs/kb) — boots/jerseys/
// teamwear/equipment are the four active roots. Mirrors category-tiles.tsx's
// mobile rail (same chip classes).
const CATEGORIES = [
  { name: 'Jerseys', slug: 'jerseys' },
  { name: 'Boots', slug: 'boots' },
  { name: 'Teamwear', slug: 'teamwear' },
  { name: 'Equipment', slug: 'equipment' },
]

interface CategoryChipRailProps {
  activeSlug: string | null
}

export function CategoryChipRail({ activeSlug }: CategoryChipRailProps) {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden">
      <Link
        href="/products"
        className={`label-caps flex-none rounded-[22px] px-[18px] py-2.5 text-[12.5px] ${
          !activeSlug ? 'bg-primary text-white' : 'border border-[#26262c] bg-secondary text-[#c9c9cf]'
        }`}
      >
        All
      </Link>
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.slug}
          href={`/products?category=${cat.slug}`}
          className={`label-caps flex-none rounded-[22px] px-[18px] py-2.5 text-[12.5px] ${
            activeSlug === cat.slug
              ? 'bg-primary text-white'
              : 'border border-[#26262c] bg-secondary text-[#c9c9cf]'
          }`}
        >
          {cat.name}
        </Link>
      ))}
    </div>
  )
}
