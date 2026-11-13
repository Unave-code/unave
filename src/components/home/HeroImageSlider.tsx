'use client'

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import Image from 'next/image'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/utilities/ui'

export interface HeroImageSlide {
  alt: string
  fit?: 'contain' | 'cover'
  src: string
}

const ROTATE_MS = 7000

export const HeroImageSlider: React.FC<{
  fallback: HeroImageSlide
  slides: HeroImageSlide[]
}> = ({ fallback, slides }) => {
  const [active, setActive] = useState(0)
  const [failedSlides, setFailedSlides] = useState<number[]>([])
  const [userPaused, setUserPaused] = useState(false)
  const [hoverPause, setHoverPause] = useState(false)
  const [focusPause, setFocusPause] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const pointerX = useRef<number | null>(null)

  const count = slides.length
  const many = count > 1
  const autoRotate = many && !userPaused && !hoverPause && !focusPause && !hidden && !reducedMotion

  const step = useCallback(
    (delta: number) => setActive((current) => (((current + delta) % count) + count) % count),
    [count],
  )

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

  const onPointerUp = (event: React.PointerEvent) => {
    if (pointerX.current === null) return
    const delta = event.clientX - pointerX.current
    pointerX.current = null
    if (Math.abs(delta) > 48) step(delta < 0 ? 1 : -1)
  }

  return (
    <div
      aria-label="Home page image slider"
      aria-roledescription="carousel"
      className="relative mt-8"
      onBlur={() => setFocusPause(false)}
      onFocus={() => setFocusPause(true)}
      onKeyDown={onKeyDown}
      onPointerCancel={() => {
        pointerX.current = null
      }}
      onPointerDown={(event) => {
        pointerX.current = event.clientX
      }}
      onPointerEnter={() => setHoverPause(true)}
      onPointerLeave={() => {
        pointerX.current = null
        setHoverPause(false)
      }}
      onPointerUp={onPointerUp}
      role="region"
    >
      <noscript>
        <style>{`
          .hero-carousel [data-hero-slide]:not(:first-child){display:none}
          .hero-carousel [data-hero-slide]{opacity:1 !important;transform:none !important}
          .hero-carousel [data-hero-controls]{display:none}
        `}</style>
      </noscript>

      <div
        className="relative isolate aspect-[3/1] overflow-hidden rounded-lg bg-cream shadow-lg"
        data-hero-image-frame=""
      >
        <div aria-live={autoRotate ? 'off' : 'polite'} className="absolute inset-0">
          {slides.map((slide, index) => {
            const isActive = index === active
            const hasFailed = failedSlides.includes(index)
            const imageFit = hasFailed ? fallback.fit : slide.fit

            return (
              <div
                aria-hidden={!isActive}
                aria-label={`${index + 1} of ${count}`}
                aria-roledescription="slide"
                className={cn(
                  'absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none',
                  isActive ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
                data-hero-slide=""
                inert={!isActive}
                key={`${slide.src}-${index}`}
                role="group"
              >
                <Image
                  alt={hasFailed ? fallback.alt : slide.alt}
                  className={imageFit === 'contain' ? 'object-contain' : 'object-cover'}
                  fill
                  onError={() =>
                    setFailedSlides((failed) =>
                      failed.includes(index) ? failed : [...failed, index],
                    )
                  }
                  priority={index === 0}
                  quality={75}
                  sizes="(min-width: 88rem) 86rem, calc(100vw - 2rem)"
                  src={hasFailed ? fallback.src : slide.src}
                />
              </div>
            )
          })}
        </div>

        {many ? (
          <div
            className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-linear-to-t from-green-900/70 to-transparent px-3 py-2 md:px-5 md:py-3"
            data-hero-controls=""
          >
            <div className="flex items-center gap-1">
              {slides.map((_, index) => (
                <button
                  aria-current={index === active ? 'true' : undefined}
                  aria-label={`Go to slide ${index + 1}`}
                  className="group inline-flex size-11 items-center justify-center rounded-pill focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gold-400"
                  key={index}
                  onClick={() => setActive(index)}
                  type="button"
                >
                  <span
                    className={cn(
                      'size-2 rounded-full transition-colors duration-200 motion-reduce:transition-none',
                      index === active ? 'bg-gold-400' : 'bg-cream/60 group-hover:bg-cream',
                    )}
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              {!reducedMotion ? (
                <button
                  aria-label={userPaused ? 'Play the image slider' : 'Pause the image slider'}
                  className="text-cream hover:bg-cream/15 inline-flex size-11 items-center justify-center rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gold-400 motion-reduce:transition-none"
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
                className="text-cream hover:bg-cream/15 inline-flex size-11 items-center justify-center rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gold-400 motion-reduce:transition-none"
                onClick={() => step(-1)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2} />
              </button>

              <button
                aria-label="Next slide"
                className="text-cream hover:bg-cream/15 inline-flex size-11 items-center justify-center rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gold-400 motion-reduce:transition-none"
                onClick={() => step(1)}
                type="button"
              >
                <ChevronRight aria-hidden="true" className="size-5" strokeWidth={2} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
