import Link from 'next/link'
import type { HomeContent } from '@/lib/api/home-content'
import { resolveMinioUrl } from '@/lib/minio-url'

function renderMultiline(text: string) {
  return text.split('\n').map((line, i, arr) => (
    <span key={i}>
      {line}
      {i < arr.length - 1 && <br />}
    </span>
  ))
}

export function Hero({ content }: { content?: HomeContent['hero'] }) {
  if (content) {
    return (
      <section className="relative h-[460px] overflow-hidden bg-[#111114] lg:h-[600px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveMinioUrl(content.imageUrl) || '/sport/hero.svg'}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 hidden lg:block"
          style={{
            background:
              'linear-gradient(90deg, rgba(10,10,12,.92) 0%, rgba(10,10,12,.6) 42%, rgba(10,10,12,.05) 78%)',
          }}
        />
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            background:
              'linear-gradient(180deg, rgba(10,10,12,.15) 30%, rgba(10,10,12,.55) 62%, rgba(10,10,12,.96))',
          }}
        />
        <div className="relative mx-auto flex h-full max-w-[1360px] items-end px-5 pb-[26px] lg:items-center lg:px-8 lg:pb-0">
          <div className="flex max-w-[560px] flex-col gap-[14px] lg:gap-5">
            {content.eyebrow && (
              <p className="label-caps text-[11px] tracking-[.12em] text-primary lg:text-[13px] lg:tracking-[.14em]">
                {content.eyebrow}
              </p>
            )}
            <h1 className="display-heading text-[56px] leading-[.88] lg:text-[88px] lg:leading-[.9]">
              {renderMultiline(content.headline)}
            </h1>
            {content.subtext && (
              <p className="max-w-[420px] text-sm leading-normal text-[#cfcfd6] lg:text-[17px]">
                {content.subtext}
              </p>
            )}
            <div className="flex flex-col gap-2.5 lg:flex-row lg:gap-[13px]">
              <Link
                href={content.primaryCta.href}
                className="label-caps rounded-[11px] bg-primary px-[30px] py-[15px] text-center text-[13.5px] tracking-[.05em] text-white transition-colors hover:bg-primary/90 lg:text-sm"
              >
                {content.primaryCta.label}
              </Link>
              {content.secondaryCta && (
                <Link
                  href={content.secondaryCta.href}
                  className="label-caps rounded-[11px] border border-white/28 bg-white/8 px-[30px] py-[15px] text-center text-[13.5px] tracking-[.05em] text-white transition-colors hover:bg-white/16 lg:text-sm"
                >
                  {content.secondaryCta.label}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative h-[460px] overflow-hidden bg-[#111114] lg:h-[600px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/sport/hero.svg"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          background:
            'linear-gradient(90deg, rgba(10,10,12,.92) 0%, rgba(10,10,12,.6) 42%, rgba(10,10,12,.05) 78%)',
        }}
      />
      <div
        className="absolute inset-0 lg:hidden"
        style={{
          background:
            'linear-gradient(180deg, rgba(10,10,12,.15) 30%, rgba(10,10,12,.55) 62%, rgba(10,10,12,.96))',
        }}
      />
      <div className="relative mx-auto flex h-full max-w-[1360px] items-end px-5 pb-[26px] lg:items-center lg:px-8 lg:pb-0">
        <div className="flex max-w-[560px] flex-col gap-[14px] lg:gap-5">
          <p className="label-caps text-[11px] tracking-[.12em] text-primary lg:text-[13px] lg:tracking-[.14em]">
            26/27 Season Drop
          </p>
          <h1 className="display-heading text-[56px] leading-[.88] lg:text-[88px] lg:leading-[.9]">
            Own
            <br />
            the pitch.
          </h1>
          <p className="max-w-[420px] text-sm leading-normal text-[#cfcfd6] lg:text-[17px]">
            The latest match kits, elite boots and training gear — built for players who don&apos;t
            clock off.
          </p>
          <div className="flex flex-col gap-2.5 lg:flex-row lg:gap-[13px]">
            <Link
              href="/products"
              className="label-caps rounded-[11px] bg-primary px-[30px] py-[15px] text-center text-[13.5px] tracking-[.05em] text-white transition-colors hover:bg-primary/90 lg:text-sm"
            >
              Shop new arrivals
            </Link>
            <Link
              href="/products?category=boots"
              className="label-caps rounded-[11px] border border-white/28 bg-white/8 px-[30px] py-[15px] text-center text-[13.5px] tracking-[.05em] text-white transition-colors hover:bg-white/16 lg:text-sm"
            >
              Shop boots
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
