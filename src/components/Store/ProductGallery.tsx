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
 * and, when there is more than one, a strip of thumbnails under it. Pointing at a thumbnail or choosing
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
    <div className="mx-auto flex w-full max-w-[36rem] flex-col gap-3">
      <figure className="min-w-0">
        <div className="bg-green-50 border-line relative aspect-square w-full overflow-hidden rounded-xl border shadow-md">
          {current ? (
            <Image
              alt={current.alt}
              className="object-cover"
              fill
              key={current.src}
              priority
              sizes="(min-width: 48rem) 576px, 100vw"
              src={current.src}
            />
          ) : (
            <Image
              alt=""
              aria-hidden="true"
              className="object-cover"
              fill
              priority
              sizes="(min-width: 48rem) 576px, 100vw"
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
          className="flex gap-2.5 overflow-x-auto p-1"
        >
          {images.map((image, index) => (
            <li className="shrink-0" key={`${image.src}-${index}`}>
              <button
                aria-label={`Show photo ${index + 1}: ${image.caption ?? image.alt}`}
                aria-pressed={index === active}
                className={cn(
                  'bg-green-50 relative block size-16 overflow-hidden rounded-lg ring-offset-2 transition-[box-shadow,opacity] duration-150 focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none motion-reduce:transition-none sm:size-20',
                  index === active
                    ? 'ring-gold-400 ring-2'
                    : 'ring-line opacity-80 ring-1 hover:opacity-100 hover:ring-green-500',
                )}
                onClick={() => setActive(index)}
                onFocus={() => setActive(index)}
                onMouseEnter={() => setActive(index)}
                type="button"
              >
                <Image alt="" className="object-cover" fill sizes="80px" src={image.src} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
