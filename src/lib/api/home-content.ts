import { draftMode } from 'next/headers'

export interface Cta {
  label: string
  href: string
}

export interface Hero {
  eyebrow?: string
  headline: string
  subtext?: string
  primaryCta: Cta
  secondaryCta?: Cta | null
  imageUrl?: string
}

export interface CategoryTile {
  label: string
  href: string
  imageUrl?: string
}

export interface Promo {
  eyebrow?: string
  heading: string
  text?: string
  cta: Cta
  imageUrl?: string
}

export interface HomeContent {
  hero: Hero
  categoryTiles: CategoryTile[]
  promo: Promo
}

export async function fetchHomeContent(): Promise<HomeContent | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
  const { isEnabled } = await draftMode()
  const url = isEnabled
    ? `${base}/content/home/draft?previewToken=${encodeURIComponent(process.env.CONTENT_PREVIEW_TOKEN ?? '')}`
    : `${base}/content/home`
  try {
    const res = await fetch(url, isEnabled ? { cache: 'no-store' } : { next: { revalidate: 3600 } })
    if (res.status === 204 || !res.ok) return null
    const json = await res.json()
    return (json?.data as HomeContent) ?? null
  } catch {
    return null
  }
}
