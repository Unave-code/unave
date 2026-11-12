import React from 'react'

import type { Hero as HeroGlobal } from '@/payload-types'

import { HeroImageSlider, type HeroImageSlide } from './HeroImageSlider'
import { HERO_HEADLINE, HERO_HEADLINE_ACCENT, IMAGES } from '@/utilities/homeCopy'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { getCachedGlobal } from '@/utilities/getGlobals'

const FALLBACK_SLIDE: HeroImageSlide = {
  alt: 'A table of freshly cooked meals from the UNAVE kitchen',
  src: IMAGES.heroBg,
}

/**
 * The home page's banner images live in the Home hero global. Unuploaded legacy
 * slides are ignored; an empty global keeps the built-in kitchen photograph.
 */
export const Hero: React.FC = async () => {
  const global = (await getCachedGlobal('hero', 10)()) as HeroGlobal | null
  const slides =
    global?.slides?.flatMap((slide, index) => {
      const image = slide.image && typeof slide.image === 'object' ? slide.image : null
      if (!image?.url) return []

      return [
        {
          alt: image.alt?.trim() || `UNAVE home banner ${index + 1}`,
          src: getMediaUrl(image.url) || IMAGES.heroBg,
        },
      ]
    }) ?? []

  return (
    <>
      <h1 className="sr-only">
        {HERO_HEADLINE} {HERO_HEADLINE_ACCENT}
      </h1>
      <HeroImageSlider fallback={FALLBACK_SLIDE} slides={slides.length ? slides : [FALLBACK_SLIDE]} />
    </>
  )
}
