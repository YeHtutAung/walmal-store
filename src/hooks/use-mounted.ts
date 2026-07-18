import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

/** True after hydration — false during SSR and the first client render.
 *  Gate any UI derived from persisted (localStorage) stores behind this so
 *  server HTML matches the first client render (hydration guard). */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}
