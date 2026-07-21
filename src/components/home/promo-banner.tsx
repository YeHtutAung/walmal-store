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

export function PromoBanner({ content }: { content?: HomeContent['promo'] }) {
  if (content) {
    return (
      <section className="mx-auto max-w-[1360px] px-4 pb-2 pt-[22px] lg:mt-9 lg:px-8 lg:pt-0">
        <div className="relative h-[300px] overflow-hidden rounded-2xl bg-card lg:h-[340px] lg:rounded-[18px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveMinioUrl(content.imageUrl) || '/sport/promo-pack.svg'}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 hidden lg:block"
            style={{
              background:
                'linear-gradient(90deg, rgba(10,10,12,.05), rgba(10,10,12,.55) 55%, rgba(10,10,12,.9))',
            }}
          />
          <div
            className="absolute inset-0 lg:hidden"
            style={{ background: 'linear-gradient(180deg, rgba(10,10,12,.1), rgba(10,10,12,.9))' }}
          />
          <div className="relative flex h-full items-end p-5 lg:items-center lg:justify-end lg:p-0">
            <div className="flex max-w-[480px] flex-col items-start gap-[14px] lg:px-12">
              {content.eyebrow && (
                <p className="label-caps text-[10.5px] tracking-[.12em] text-primary lg:text-[12.5px]">
                  {content.eyebrow}
                </p>
              )}
              <p className="display-heading text-[34px] leading-[.9] text-white lg:text-5xl lg:leading-[.92]">
                {renderMultiline(content.heading)}
              </p>
              {content.text && (
                <p className="hidden max-w-[340px] text-[15px] text-[#cfcfd6] lg:block">
                  {content.text}
                </p>
              )}
              <Link
                href={content.cta.href}
                className="label-caps rounded-[10px] bg-white px-[22px] py-3 text-xs text-[#0c0c0e] transition-colors hover:bg-primary hover:text-white lg:rounded-[11px] lg:px-7 lg:py-3.5 lg:text-[13.5px]"
              >
                {content.cta.label}
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-[1360px] px-4 pb-2 pt-[22px] lg:mt-9 lg:px-8 lg:pt-0">
      <div className="relative h-[300px] overflow-hidden rounded-2xl bg-card lg:h-[340px] lg:rounded-[18px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sport/promo-pack.svg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 hidden lg:block"
          style={{
            background:
              'linear-gradient(90deg, rgba(10,10,12,.05), rgba(10,10,12,.55) 55%, rgba(10,10,12,.9))',
          }}
        />
        <div
          className="absolute inset-0 lg:hidden"
          style={{ background: 'linear-gradient(180deg, rgba(10,10,12,.1), rgba(10,10,12,.9))' }}
        />
        <div className="relative flex h-full items-end p-5 lg:items-center lg:justify-end lg:p-0">
          <div className="flex max-w-[480px] flex-col items-start gap-[14px] lg:px-12">
            <p className="label-caps text-[10.5px] tracking-[.12em] text-primary lg:text-[12.5px]">
              Limited release
            </p>
            <p className="display-heading text-[34px] leading-[.9] text-white lg:text-5xl lg:leading-[.92]">
              The Velocity
              <br />
              Elite Pack
            </p>
            <p className="hidden max-w-[340px] text-[15px] text-[#cfcfd6] lg:block">
              Featherweight speed boots engineered for the counter-attack. Only while stocks last.
            </p>
            <Link
              href="/products?category=boots"
              className="label-caps rounded-[10px] bg-white px-[22px] py-3 text-xs text-[#0c0c0e] transition-colors hover:bg-primary hover:text-white lg:rounded-[11px] lg:px-7 lg:py-3.5 lg:text-[13.5px]"
            >
              Shop the pack
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
