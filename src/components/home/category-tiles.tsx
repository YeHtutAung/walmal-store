import Link from 'next/link'

// Slugs are coupled to the V17 seeded taxonomy (see docs/kb) — boots/jerseys/
// teamwear/equipment are the four active roots.
const CATEGORIES = [
  { name: 'Jerseys', slug: 'jerseys', img: '/sport/cat-jerseys.svg' },
  { name: 'Boots', slug: 'boots', img: '/sport/cat-boots.svg' },
  { name: 'Teamwear', slug: 'teamwear', img: '/sport/cat-teamwear.svg' },
  { name: 'Equipment', slug: 'equipment', img: '/sport/cat-equipment.svg' },
]

export function CategoryTiles() {
  return (
    <section className="mx-auto max-w-[1360px]">
      {/* Desktop: 4-up image tiles */}
      <div className="hidden gap-4 px-8 pb-2 pt-7 lg:grid lg:grid-cols-4">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/products?category=${cat.slug}`}
            className="group relative h-[230px] overflow-hidden rounded-[14px] bg-secondary"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cat.img} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(10,10,12,.05), rgba(10,10,12,.82))' }}
            />
            <div className="absolute bottom-[18px] left-5">
              <p className="display-heading text-[26px] text-white">{cat.name}</p>
              <p className="label-caps mt-[5px] text-xs font-bold text-primary">Shop now →</p>
            </div>
          </Link>
        ))}
      </div>
      {/* Mobile: horizontal chip rail */}
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-1.5 pt-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden">
        <Link
          href="/products"
          className="label-caps flex-none rounded-[22px] bg-primary px-[18px] py-2.5 text-[12.5px] text-white"
        >
          All
        </Link>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/products?category=${cat.slug}`}
            className="label-caps flex-none rounded-[22px] border border-[#26262c] bg-secondary px-[18px] py-2.5 text-[12.5px] text-[#c9c9cf]"
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </section>
  )
}
