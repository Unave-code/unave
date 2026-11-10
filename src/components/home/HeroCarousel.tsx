'use client'

import { ChevronLeft, ChevronRight, FlaskConical, Leaf, Lock, Pause, Play, UtensilsCrossed } from 'lucide-react'
import Image from 'next/image'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { CTA_BASE, CTA_VARIANTS } from '@/components/Cta'
import { Swoosh } from '@/components/Swoosh'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { cn } from '@/utilities/ui'

export type HeroChipIcon = 'flask' | 'leaf' | 'lock' | 'utensils'

export interface HeroCarouselSlide {
  eyebrow: string | null
  headline: string
  subLine: string | null
  imageSrc: string
  /** Draw the dark green scrim behind the copy. Chosen per slide in the admin. */
  overlay: boolean
  primary: { label: string; href: string; external: boolean; whatsapp: boolean }
  secondary: { label: string; href: string; newTab: boolean } | null
}

interface Props {
  chips?: ReadonlyArray<{ icon: HeroChipIcon; label: string }>
  slides: HeroCarouselSlide[]
}

const CHIP_ICONS = {
  flask: FlaskConical,
  leaf: Leaf,
  lock: Lock,
  utensils: UtensilsCrossed,
} as const

const ROTATE_MS = 7000

/**
 * The headline carries one phrase in gold italics, written between asterisks in
 * the admin (for example: Good food, cooked in *our own kitchen*). Odd splits are
 * the starred phrases.
 */
const renderHeadline = (headline: string) =>
  headline.split(/\*([^*]+)\*/g).map((part, index) =>
    index % 2 === 1 ? (
      <span className="text-gold-400 italic" key={index}>
        {part}
      </span>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    ),
  )

/**
 * The home page hero carousel (design.md §6.3). Calm by design: one photograph
 * cross-fades into the next while the copy fades up, and the carousel turns by
 * itself only while the visitor is idle — it pauses on hover, on focus, when the
 * tab is hidden, whenever a reduced-motion preference is set, and at the press of
 * the pause button (WCAG 2.2.2).
 *
 * The slides stack in one grid cell, so the section keeps the height of its
 * tallest slide and no slide pushes the page around. Without JavaScript the
 * stacking is undone by a <noscript> rule and every slide reads in order, with
 * the controls out of the way.
 */
export const HeroCarousel: React.FC<Props> = ({ chips, slides }) => {
  const [active, setActive] = useState(0)
  const [userPaused, setUserPaused] = useState(false)
  const [hoverPause, setHoverPause] = useState(false)
  const [focusPause, setFocusPause] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const pointerX = useRef<number | null>(null)

  const count = slides.length
  const many = count > 1
  const autoRotate = many && !userPaused && !hoverPause && !focusPause && !hidden && !reducedMotion

  const goTo = useCallback(
    (index: number) => setActive(((index % count) + count) % count),
    [count],
  )
  const step = useCallback(
    (delta: number) => setActive((current) => (((current + delta) % count) + count) % count),
    [count],
  )

  /* A reduced-motion preference stops the rotation entirely; the visitor still
     turns the slides themselves. */
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)

    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const update = () => setHidden(document.hidden)

    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  /* One timer per active slide, so a manual turn also resets the wait. */
  useEffect(() => {
    if (!autoRotate) return
    const timer = window.setTimeout(() => step(1), ROTATE_MS)
    return () => window.clearTimeout(timer)
  }, [autoRotate, step, active])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      step(-1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      step(1)
    }
  }

  const onPointerDown = (event: React.PointerEvent) => {
    pointerX.current = event.clientX
  }

  const onPointerUp = (event: React.PointerEvent) => {
    if (pointerX.current === null) return
    const delta = event.clientX - pointerX.current
    pointerX.current = null
    if (Math.abs(delta) > 48) step(delta < 0 ? 1 : -1)
  }

  return (
    <section
      aria-label="Highlights from the kitchen"
      aria-roledescription="carousel"
      className="hero-carousel opening-band opening-band-tall relative overflow-hidden py-14 text-cream md:py-28"
      onBlur={() => setFocusPause(false)}
      onFocus={() => setFocusPause(true)}
      onKeyDown={onKeyDown}
      onPointerCancel={() => {
        pointerX.current = null
      }}
      onPointerDown={onPointerDown}
      onPointerEnter={() => setHoverPause(true)}
      onPointerLeave={() => {
        pointerX.current = null
        setHoverPause(false)
      }}
      onPointerUp={onPointerUp}
    >
      <noscript>
        <style>{`
          .hero-carousel [data-hero-bg]:not(:first-child){display:none}
          .hero-carousel [data-hero-stack]{display:block}
          .hero-carousel [data-hero-slide]{opacity:1 !important;transform:none !important}
          .hero-carousel [data-hero-controls]{display:none}
        `}</style>
      </noscript>

      {/* The slide photographs, stacked and cross-faded. Only the first loads with
          the document; the rest wait their turn. */}
      <div aria-hidden="true" className="absolute inset-0">
        {slides.map((slide, index) => (
          <div
            className={cn(
              'absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none',
              index === active ? 'opacity-100' : 'opacity-0',
            )}
            data-hero-bg=""
            key={slide.imageSrc + index}
          >
            <Image
              alt=""
              className="object-cover"
              fill
              priority={index === 0}
              quality={75}
              sizes="100vw"
              src={slide.imageSrc}
            />
            {slide.overlay ? (
              <div className="bg-green-900/85 lg:bg-transparent lg:bg-linear-to-r lg:from-green-900 lg:via-green-900/90 lg:to-green-900/45 absolute inset-0" />
            ) : null}
          </div>
        ))}
      </div>

      <Swoosh className="text-gold-400/[0.08] -top-40 -right-32 w-[42rem]" />

      <div className="container relative">
        <div
          aria-live={autoRotate ? 'off' : 'polite'}
          className="grid"
          data-hero-stack=""
        >
          {slides.map((slide, index) => {
            const isActive = index === active
            const primaryProps = slide.primary.external
              ? { rel: 'noopener noreferrer', target: '_blank' as const }
              : {}

            return (
              <div
                aria-hidden={!isActive}
                aria-label={`${index + 1} of ${count}`}
                aria-roledescription="slide"
                className={cn(
                  'col-start-1 row-start-1 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none',
                  isActive ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
                )}
                data-hero-slide=""
                inert={!isActive}
                key={index}
                role="group"
              >
                <div className="max-w-[46rem]">
                  {slide.eyebrow ? (
                    <p className="text-eyebrow text-gold-400 uppercase">{slide.eyebrow}</p>
                  ) : null}

                  {/* The first slide carries the page's one h1; the rest read as
                      paragraphs, visually identical (design.md §12). */}
                  {index === 0 ? (
                    <h1 className="text-display text-balance mt-4">{renderHeadline(slide.headline)}</h1>
                  ) : (
                    <p className="text-display text-balance mt-4">{renderHeadline(slide.headline)}</p>
                  )}

                  {slide.subLine ? (
                    <p className="text-lead text-cream/85 mt-6 max-w-[52ch]">{slide.subLine}</p>
                  ) : null}

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    {slide.primary.external ? (
                      <a
                        className={cn(CTA_BASE, CTA_VARIANTS.onDark)}
                        href={slide.primary.href}
                        {...primaryProps}
                      >
                        {slide.primary.whatsapp ? <WhatsAppIcon className="size-4" /> : null}
                        {slide.primary.label}
                      </a>
                    ) : (
                      <a className={cn(CTA_BASE, CTA_VARIANTS.onDark)} href={slide.primary.href}>
                        {slide.primary.label}
                      </a>
                    )}

                    {slide.secondary ? (
                      <a
                        className={cn(CTA_BASE, CTA_VARIANTS.onDarkSecondary)}
                        href={slide.secondary.href}
                        {...(slide.secondary.newTab
                          ? { rel: 'noopener noreferrer', target: '_blank' as const }
                          : {})}
                      >
                        {slide.secondary.label}
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {chips?.length ? (
          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
            {chips.map((chip) => {
              const Icon = CHIP_ICONS[chip.icon]

              return (
                <li className="text-caption text-cream/80 flex items-center gap-2" key={chip.label}>
                  {Icon ? (
                    <Icon aria-hidden="true" className="text-gold-400 size-4" strokeWidth={2} />
                  ) : null}
                  {chip.label}
                </li>
              )
            })}
          </ul>
        ) : null}

        {many ? (
          <div className="mt-6 flex items-center justify-between" data-hero-controls="">
            <div className="flex items-center gap-1">
              {slides.map((_, index) => (
                <button
                  aria-current={index === active ? 'true' : undefined}
                  aria-label={`Go to slide ${index + 1}`}
                  className="group inline-flex h-11 w-11 items-center justify-center rounded-pill focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gold-400"
                  key={index}
                  onClick={() => goTo(index)}
                  type="button"
                >
                  <span
                    className={cn(
                      'size-2 rounded-full transition-colors duration-200 motion-reduce:transition-none',
                      index === active ? 'bg-gold-400' : 'bg-cream/40 group-hover:bg-cream/70',
                    )}
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              {/* Under a reduced-motion preference the carousel never turns by
                  itself, so there is nothing to pause. */}
              {many && !reducedMotion ? (
                <button
                  aria-label={userPaused ? 'Play the carousel' : 'Pause the carousel'}
                  className="text-cream hover:bg-cream/10 inline-flex size-11 items-center justify-center rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gold-400 motion-reduce:transition-none"
                  onClick={() => setUserPaused((paused) => !paused)}
                  type="button"
                >
                  {userPaused ? (
                    <Play aria-hidden="true" className="size-5" strokeWidth={2} />
                  ) : (
                    <Pause aria-hidden="true" className="size-5" strokeWidth={2} />
                  )}
                </button>
              ) : null}

              <button
                aria-label="Previous slide"
                className="text-cream hover:bg-cream/10 inline-flex size-11 items-center justify-center rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gold-400 motion-reduce:transition-none"
                onClick={() => step(-1)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2} />
              </button>

              <button
                aria-label="Next slide"
                className="text-cream hover:bg-cream/10 inline-flex size-11 items-center justify-center rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gold-400 motion-reduce:transition-none"
                onClick={() => step(1)}
                type="button"
              >
                <ChevronRight aria-hidden="true" className="size-5" strokeWidth={2} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
