const ITEMS = [
  { title: 'Free local delivery', sub: 'On every order above $80, shipped next day' },
  { title: 'Worldwide shipping', sub: 'We deliver match-day gear across the globe' },
  { title: 'Secure payment', sub: 'All major methods, encrypted at checkout' },
]

export function TrustBar() {
  return (
    <section className="mx-auto mt-6 max-w-[1360px] px-4 pb-2 lg:mt-11 lg:px-8">
      <div className="grid grid-cols-1 gap-4 border-y border-border py-[22px] lg:grid-cols-3 lg:gap-5 lg:py-8">
        {ITEMS.map((item) => (
          <div key={item.title} className="flex items-start gap-3.5">
            <span className="mt-1 h-3 w-3 flex-none rotate-45 bg-primary" aria-hidden />
            <div>
              <p className="label-caps text-[13px] text-white lg:text-sm">{item.title}</p>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground lg:text-[13px]">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
