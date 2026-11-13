import React from 'react'

import type { Hero as HeroGlobal } from '@/payload-types'

import { HeroImageSlider, type HeroImageSlide } from './HeroImageSlider'
import { IMAGES } from '@/utilities/homeCopy'

import { getMediaUrl } from '@/utilities/getMediaUrl'
import { getCachedGlobal } from '@/utilities/getGlobals'

const FALLBACK_SLIDE: HeroImageSlide = {
  alt: 'A table of freshly cooked meals from the UNAVE kitchen',
  fit: 'cover',
  src: IMAGES.heroBg,
}

/**
 * The hero's offer stays in accessible text; wide CMS banners keep their full
 * message visible on small screens.
 */
export const Hero: React.FC = async () => {
  const global = (await getCachedGlobal('hero', 10)()) as HeroGlobal | null
  const slides =
    global?.slides?.flatMap((slide) => {
      const image = slide.image && typeof slide.image === 'object' ? slide.image : null
      if (!image?.url) return []

      return [
        {
          alt: image.alt?.trim() || '',
          fit: 'contain' as const,
          src: getMediaUrl(image.url) || IMAGES.heroBg,
        },
      ]
    }) ?? []

  return (
    <section className="hero-carousel opening-band opening-band-tall bg-white pb-5 md:pb-6">
      <div className="container">
        <HeroImageSlider
          fallback={FALLBACK_SLIDE}
          slides={slides.length ? slides : [FALLBACK_SLIDE]}
        />
      </div>
    </section>
  )
}
