import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import type { Hero as HeroGlobal } from '@/payload-types'

import { GALLERY, HERO_HEADLINE, HERO_HEADLINE_ACCENT } from '@/utilities/homeCopy'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { safeLinkHref } from '@/utilities/safeLinkHref'
import { Section } from './Section'

/**
 * The three-photo band directly below the home hero, with descriptive alt text.
 */
export const Gallery: React.FC = async () => {
  const global = (await getCachedGlobal('hero', 1)()) as HeroGlobal | null
  const items = [
    [GALLERY[0], global?.gallery?.image1],
    [GALLERY[1], global?.gallery?.image2],
    [GALLERY[2], global?.gallery?.image3],
  ] as const

  return (
    <Section className="pt-6 md:pt-10" tone="white">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map(([fallback, item], index) => {
          const media = item?.image && typeof item.image === 'object' ? item.image : null
          const src = media?.url ? getMediaUrl(media.url, media.updatedAt) : fallback.image
          const alt = media ? media.alt?.trim() || `Home gallery image ${index + 1}` : fallback.alt
          const href = safeLinkHref(item?.link)
          const image = (
            <Image
              alt={alt}
              className="object-cover"
              fill
              quality={75}
              sizes="(min-width: 88rem) 27rem, (min-width: 64rem) 33vw, (min-width: 48rem) 50vw, 100vw"
              src={src}
            />
          )

          return (
            <figure
              className="relative aspect-[16/9] overflow-hidden rounded-lg"
              key={`home-gallery-${index + 1}`}
            >
              {href ? (
                <Link
                  className="absolute inset-0 block rounded-lg focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-green-900 focus-visible:outline-none"
                  href={href}
                >
                  {image}
                </Link>
              ) : (
                image
              )}
            </figure>
          )
        })}
      </div>
      <div className="max-w-3xl container relative z-10 px-4 text-center pt-6 md:px-6">
        <h1
          className="text-hero text-green-900 text-balance font-bold leading-[1.1] pb-1"
          id="home-hero-heading"
        >
          {HERO_HEADLINE} <span className="text-gold-600 italic">{HERO_HEADLINE_ACCENT}</span>
        </h1>
      </div>
    </Section>
  )
}
