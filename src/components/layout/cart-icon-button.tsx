'use client'

import Link from 'next/link'
import { useCart } from '@/hooks/use-cart'
import { useMounted } from '@/hooks/use-mounted'

interface CartIconButtonProps {
  onClick?: () => void
}

const buttonClasses =
  'label-caps inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2.5 text-[12.5px] text-primary-foreground transition-colors hover:bg-primary/85'

export function CartIconButton({ onClick }: CartIconButtonProps) {
  const { itemCount } = useCart()
  // Cart count comes from a persisted (localStorage) store — render 0 until
  // mounted so server HTML and first client render match (hydration guard).
  const mounted = useMounted()
  const count = mounted ? itemCount : 0

  const pill = count > 0 && (
    <span className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-white px-1 text-[11px] font-extrabold leading-none text-background">
      {count > 99 ? '99+' : count}
    </span>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className={buttonClasses}
        aria-label={`Cart (${count} items)`}
        onClick={onClick}
      >
        Bag
        {pill}
      </button>
    )
  }

  return (
    <Link href="/cart" className={buttonClasses} aria-label={`Cart (${count} items)`}>
      Bag
      {pill}
    </Link>
  )
}
