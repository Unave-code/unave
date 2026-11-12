import Image from 'next/image'
import React from 'react'

import { GALLERY } from '@/utilities/homeCopy'

import { Section } from './Section'

/**
 * The three-photo band directly below the home hero, with captions and descriptive alt text.
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
  </Section>
)
