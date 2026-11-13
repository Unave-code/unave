import Image from 'next/image'
import React from 'react'

import { GALLERY, HERO_HEADLINE, HERO_HEADLINE_ACCENT, HERO_OFFER_COPY } from '@/utilities/homeCopy'
import { Section } from './Section'

/**
 * The three-photo band directly below the home hero, with descriptive alt text.
 */
export const Gallery: React.FC = () => (
  <Section className="pt-6 md:pt-10" tone="white">
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {GALLERY.map((item) => (
        <figure className="relative aspect-[16/9] overflow-hidden rounded-lg" key={item.image}>
          <Image
            alt={item.alt}
            className="object-cover"
            fill
            quality={75}
            sizes="(min-width: 88rem) 27rem, (min-width: 64rem) 33vw, (min-width: 48rem) 50vw, 100vw"
            src={item.image}
          />
        </figure>
      ))}
    </div>
    <div className="max-w-3xl container relative z-10 px-4 text-center pt-6 md:px-6">
      <h1 className="text-hero text-green-900 font-bold leading-[1.1] pb-1" id="home-hero-heading">
        {HERO_HEADLINE} <span className="text-gold-600 italic">{HERO_HEADLINE_ACCENT}</span>
      </h1>
      <p className="text-body text-center text-ink-700 mt-2 max-w-[65ch]">{HERO_OFFER_COPY}</p>
    </div>
  </Section>
)
