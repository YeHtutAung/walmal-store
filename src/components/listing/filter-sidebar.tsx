'use client'

interface FilterSidebarProps {
  facets: { brand: string; count: number }[]
  brands: Set<string>
  maxPrice: number | null
  priceCeiling: number
  onToggleBrand: (brand: string) => void
  onSetMaxPrice: (value: number | null) => void
  onClearAll: () => void
}

export function FilterSidebar({
  facets,
  brands,
  maxPrice,
  priceCeiling,
  onToggleBrand,
  onSetMaxPrice,
  onClearAll,
}: FilterSidebarProps) {
  const hasActiveFilters = brands.size > 0 || maxPrice != null

  return (
    <aside className="hidden lg:block">
      <div className="flex items-center justify-between">
        <h2 className="label-caps text-[12px] text-[#8a8a90]">Filters</h2>
        <button
          type="button"
          onClick={onClearAll}
          className="text-[12px] text-[#6b6b73] underline transition-colors hover:text-foreground"
        >
          Clear all
        </button>
      </div>

      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          {[...brands].map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => onToggleBrand(brand)}
              className="label-caps flex items-center gap-1.5 rounded-full border border-[#26262c] bg-secondary px-3 py-1.5 text-[11px] text-[#c9c9cf]"
            >
              {brand}
              <span aria-hidden="true">×</span>
            </button>
          ))}
          {maxPrice != null && (
            <button
              type="button"
              onClick={() => onSetMaxPrice(null)}
              className="label-caps flex items-center gap-1.5 rounded-full border border-[#26262c] bg-secondary px-3 py-1.5 text-[11px] text-[#c9c9cf]"
            >
              Under ${maxPrice}
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>
      )}

      <div className="mt-6">
        <h3 className="label-caps text-[11px] text-[#8a8a90]">Brand</h3>
        <ul className="mt-3 space-y-2.5">
          {facets.map(({ brand, count }) => {
            const active = brands.has(brand)
            return (
              <li key={brand}>
                <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-[#c9c9cf]">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => onToggleBrand(brand)}
                    className="sr-only"
                  />
                  <span
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border text-[11px] leading-none text-white ${
                      active ? 'border-primary bg-primary' : 'border-[#3a3a42]'
                    }`}
                    aria-hidden="true"
                  >
                    {active && '✓'}
                  </span>
                  <span className="flex-1">{brand}</span>
                  <span className="text-[#6b6b73]">{count}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="mt-6">
        <h3 className="label-caps text-[11px] text-[#8a8a90]">
          Max price — {maxPrice == null ? 'Any' : `$${maxPrice}`}
        </h3>
        <input
          type="range"
          min={0}
          max={priceCeiling}
          step={10}
          value={maxPrice ?? priceCeiling}
          onChange={(e) => {
            const v = Number(e.target.value)
            onSetMaxPrice(v >= priceCeiling ? null : v)
          }}
          className="mt-3 w-full accent-primary"
          aria-label="Max price"
        />
        <div className="mt-1 flex justify-between text-[11px] text-[#6b6b73]">
          <span>$0</span>
          <span>${priceCeiling}</span>
        </div>
      </div>
    </aside>
  )
}
