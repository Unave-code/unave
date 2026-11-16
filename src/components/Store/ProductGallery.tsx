'use client'

import Image from 'next/image'
import React, { useState } from 'react'

import { cn } from '@/utilities/ui'

import { PRODUCT_PLACEHOLDER } from './productPlaceholder'

export type GalleryImage = {
  alt: string
  /** Shown under the main photo while this image is on show, e.g. a combo item's name. */
  caption?: string
  src: string
}

/**
 * The product page's photo gallery (design.md §6.15): one large square photo
 * and, when there is more than one, a strip of thumbnails — down the left on a
 * wide screen, along the bottom on a phone. Pointing at a thumbnail or choosing
 * it shows that photo; the thumbnails are real buttons, so the keyboard reaches
 * them and the choice is announced.
 *
 * With no photo at all the frame shows the branded placeholder and no strip.
 */
export const ProductGallery: React.FC<{ images: GalleryImage[]; paused?: boolean }> = ({
  images,
  paused,
}) => {
  const [active, setActive] = useState(0)
  const current = images[active] ?? images[0]
  const hasStrip = images.length > 1

  return (
    <div className={cn('flex flex-col gap-3', hasStrip && 'lg:flex-row-reverse lg:items-start')}>
      <figure className="min-w-0 flex-1">
        <div className="bg-green-50 relative aspect-square w-full mx-auto max-w-[30rem] overflow-hidden rounded-lg shadow-md">
          {current ? (
            <Image
              alt={current.alt}
              className="object-cover"
              fill
              key={current.src}
              priority
              sizes="(max-width: 480px) 100vw, 480px"
              src={current.src}
            />
          ) : (
            <Image
              alt=""
              aria-hidden="true"
              className="object-cover"
              fill
              priority
              sizes="(max-width: 480px) 100vw, 480px"
              src={PRODUCT_PLACEHOLDER}
            />
          )}

          {paused ? (
            <span className="rounded-pill bg-gold-400 text-green-900 absolute top-4 left-4 inline-flex min-h-7 items-center px-3 text-xs font-bold tracking-wide uppercase shadow-sm">
              Paused
            </span>
          ) : null}
        </div>

        {hasStrip && current?.caption ? (
          <figcaption aria-live="polite" className="text-caption text-ink-600 mt-2 text-center">
            {current.caption}
          </figcaption>
        ) : null}
      </figure>

      {hasStrip ? (
        <ul
          aria-label="Product photos"
          className="flex gap-2 overflow-x-auto pb-1 lg:max-h-[32rem] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0"
        >
          {images.map((image, index) => (
            <li className="shrink-0" key={`${image.src}-${index}`}>
              <button
                aria-label={`Show photo ${index + 1}: ${image.caption ?? image.alt}`}
                aria-pressed={index === active}
                className={cn(
                  'bg-green-50 relative block size-16 overflow-hidden rounded-md ring-offset-2 transition-[box-shadow,opacity] duration-150 focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none motion-reduce:transition-none sm:size-[4.5rem]',
                  index === active
                    ? 'ring-gold-400 ring-2'
                    : 'ring-line opacity-80 ring-1 hover:opacity-100 hover:ring-green-500',
                )}
                onClick={() => setActive(index)}
                onFocus={() => setActive(index)}
                onMouseEnter={() => setActive(index)}
                type="button"
              >
                <Image alt="" className="object-cover" fill sizes="72px" src={image.src} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
