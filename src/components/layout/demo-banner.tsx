'use client'

import { useState } from 'react'
import { useMounted } from '@/hooks/use-mounted'

const DISMISS_KEY = 'walmal-demo-banner-dismissed'

/**
 * Public-demo notice: the deployed store runs Stripe in TEST mode (spec
 * decision — nothing is ever charged). Dismissal persists in localStorage;
 * the E2E clearState helper pre-seeds the dismissal so the pre-banner tests
 * never see it (TC-E2E-042 covers the banner itself). Rendering is
 * mounted-gated (persisted state) per the KB hydration-guard rule.
 */
export function DemoBanner() {
  const mounted = useMounted()
  // Lazy initializer runs on the client's first render only; the mounted gate
  // below keeps server HTML and first client paint identical regardless.
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1',
  )
  if (!mounted || dismissed) return null

  return (
    <div
      data-testid="demo-banner"
      className="flex items-center justify-center gap-3 bg-[#0f1a14] px-4 py-2 text-center text-[12.5px] text-[#9fe8c0]"
    >
      <span>
        Demo store — nothing is charged. Pay with test card{' '}
        <b className="tracking-wide">4242 4242 4242 4242</b>, any future expiry, any CVC.
      </span>
      <button
        type="button"
        aria-label="Dismiss demo notice"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, '1')
          setDismissed(true)
        }}
        className="rounded px-1.5 text-[15px] leading-none text-[#5f8f74] transition-colors hover:text-white"
      >
        ×
      </button>
    </div>
  )
}
