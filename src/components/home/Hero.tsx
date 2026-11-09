import React from 'react'

import type { Hero as HeroGlobal } from '@/payload-types'

import { HeroCarousel, type HeroCarouselSlide } from './HeroCarousel'
import {
  HERO_CHIPS,
  HERO_EYEBROW,
  HERO_HEADLINE,
  HERO_HEADLINE_ACCENT,
  HERO_SECONDARY,
  HERO_SUB,
  HOME_HREF_CONTACT,
  HOME_HREF_HOW_IT_WORKS,
  IMAGES,
} from '@/utilities/homeCopy'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { WHATSAPP_CTA_LABEL, WHATSAPP_FALLBACK_LABEL, whatsappHref } from '@/utilities/whatsapp'

/**
 * What a slide in the CMS turns into: everything resolved server-side, so the
 * carousel receives nothing it has to decide about. An empty photograph falls
 * back to the built-in kitchen photograph, and the primary button falls back to
 * WhatsApp on the footer's number, then to the contact page (design.md §6.3).
 */
const toSlide = (slide: NonNullable<HeroGlobal['slides']>[number], whatsapp: null | string): HeroCarouselSlide => {
  const whatsappPrimary = slide.primaryWhatsapp !== false

  const primary = whatsappPrimary
    ? {
        label: slide.primaryLabel?.trim() || (whatsapp ? WHATSAPP_CTA_LABEL : WHATSAPP_FALLBACK_LABEL),
        href: whatsapp ? whatsappHref(whatsapp) : HOME_HREF_CONTACT,
        external: Boolean(whatsapp),
        whatsapp: true,
      }
    : {
        label: slide.primaryLabel?.trim() || 'Message us',
        href: slide.primaryUrl?.trim() || HOME_HREF_CONTACT,
        external: Boolean(slide.primaryNewTab),
        whatsapp: false,
      }

  const secondaryLabel = slide.secondaryLabel?.trim()
  const secondaryUrl = slide.secondaryUrl?.trim()

  return {
    eyebrow: slide.eyebrow?.trim() || null,
    headline: slide.headline,
    subLine: slide.subLine?.trim() || null,
    imageSrc:
      getMediaUrl(slide.image && typeof slide.image === 'object' ? slide.image.url : null) ||
      IMAGES.heroBg,
    primary,
    secondary:
      secondaryLabel && secondaryUrl
        ? { label: secondaryLabel, href: secondaryUrl, newTab: Boolean(slide.secondaryNewTab) }
        : null,
  }
}

/**
 * The home page hero (design.md §6.3, §10.1). The slides come from the Home hero
 * global in the admin; if the global holds none — it should not happen, the
 * global seeds one — the hero the page shipped with stands in, so the home page
 * is never without its opening. (The hero global revalidates itself on save.)
 */
export const Hero: React.FC<{ whatsapp?: null | string }> = async ({ whatsapp }) => {
  const global = (await getCachedGlobal('hero', 10)()) as HeroGlobal | null
  const slides =
    global?.slides?.length && global.slides.length > 0
      ? global.slides.map((slide) => toSlide(slide, whatsapp ?? null))
      : [
          {
            eyebrow: HERO_EYEBROW,
            headline: `${HERO_HEADLINE} *${HERO_HEADLINE_ACCENT}*`,
            subLine: HERO_SUB,
            imageSrc: IMAGES.heroBg,
            primary: {
              label: whatsapp ? WHATSAPP_CTA_LABEL : WHATSAPP_FALLBACK_LABEL,
              href: whatsapp ? whatsappHref(whatsapp) : HOME_HREF_CONTACT,
              external: Boolean(whatsapp),
              whatsapp: true,
            },
            secondary: { label: HERO_SECONDARY, href: HOME_HREF_HOW_IT_WORKS, newTab: false },
          },
        ]

  return <HeroCarousel chips={HERO_CHIPS} slides={slides} />
}
