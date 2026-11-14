import { Quote } from 'lucide-react'
import React from 'react'

import type { Media, Testimonial as TestimonialsGlobal } from '@/payload-types'

import { getCachedGlobal } from '@/utilities/getGlobals'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { TESTIMONIALS_HEADING } from '@/utilities/homeCopy'
import { cn } from '@/utilities/ui'

import { Section } from './Section'

type Item = NonNullable<TestimonialsGlobal['items']>[number]

const asMedia = (value: Item['video']): Media | null =>
  value && typeof value === 'object' ? value : null

/** A quote longer than this takes two columns so it never reads as a tall strip. */
const LONG_QUOTE = 160

/* Light tiles take turns between three calm surfaces so a full grid has
   rhythm without a new colour. */
const LIGHT_TONES = ['bg-card', 'bg-green-50', 'bg-gold-100'] as const

const Caption: React.FC<{ dark?: boolean; name: string; note?: string | null }> = ({
  dark = false,
  name,
  note,
}) => (
  <figcaption className="mt-auto pt-5">
    <span className={cn('text-caption block font-bold', dark ? 'text-cream' : 'text-ink-900')}>
      {name}
    </span>
    {note?.trim() ? (
      <span className={cn('text-caption block', dark ? 'text-cream/75' : 'text-ink-600')}>
        {note}
      </span>
    ) : null}
  </figcaption>
)

/**
 * Customer words, edited in the admin under Website → Testimonials, laid out
 * as a bento grid (design.md §11).
 *
 * The first written quote is the feature tile: two columns by two rows on the
 * deep green, the quote set large in cream. Every video is a tall tile two
 * rows high so a portrait clip keeps its shape. Other quotes are single tiles,
 * or two columns wide when they run long, on light surfaces that take turns.
 * The grid packs densely, so whatever order the kitchen sets in the admin, the
 * tiles close up without holes. Three columns from `lg`, two from `md`, one on
 * a phone, where every tile simply stacks.
 *
 * The section renders nothing until at least one entry is published, so the
 * home page never shows placeholder proof.
 */
export const Testimonials: React.FC = async () => {
  const global = (await getCachedGlobal('testimonials', 1)()) as TestimonialsGlobal | null

  const items = (global?.items ?? []).filter((item) => {
    if (!item.name?.trim()) return false
    if (item.kind === 'video') return Boolean(asMedia(item.video)?.url)
    return Boolean(item.quote?.trim())
  })

  if (!items.length) return null

  const featureIndex = items.findIndex((item) => item.kind !== 'video')
  let lightTile = 0

  /* How many grid cells each tile fills: on two columns (md) a video is one
     tile; on three (lg) it stands two rows tall. When the cells do not fill
     the last row, the last plain quote widens to close it, so the grid never
     ends on a gap. */
  const isLongQuote = (item: Item) => (item.quote?.trim().length ?? 0) > LONG_QUOTE
  const cells = (columns: 2 | 3) =>
    items.reduce((sum, item, index) => {
      if (index === featureIndex) return sum + 4
      if (item.kind === 'video') return sum + (columns === 3 ? 2 : 1)
      return sum + (isLongQuote(item) ? 2 : 1)
    }, 0)
  const lastPlain = items.reduce(
    (last, item, index) => (item.kind !== 'video' && index !== featureIndex ? index : last),
    -1,
  )
  const mdGap = cells(2) % 2
  const lgGap = (3 - (cells(3) % 3)) % 3

  return (
    <Section id="testimonials">
      <h2 className="text-h2">{global?.heading?.trim() || TESTIMONIALS_HEADING}</h2>

      <ul
        aria-label="Customer testimonials"
        className="mt-10 grid grid-flow-row-dense auto-rows-[minmax(10rem,auto)] gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        {items.map((item, index) => {
          const key = item.id ?? `${item.name}-${index}`

          if (item.kind === 'video') {
            const video = asMedia(item.video)!
            const poster = asMedia(item.poster)

            return (
              <li className="min-w-0 lg:row-span-2" key={key}>
                <figure className="tile-lift bg-card flex h-full flex-col rounded-lg p-3 shadow-sm">
                  <video
                    aria-label={`Video testimonial from ${item.name}`}
                    className="aspect-[4/5] w-full flex-1 rounded-md bg-green-900 object-cover lg:aspect-auto lg:min-h-80"
                    controls
                    playsInline
                    poster={poster?.url ? getMediaUrl(poster.url) : undefined}
                    preload="metadata"
                    src={getMediaUrl(video.url)}
                  />

                  <div className="flex flex-col px-2 pb-1">
                    {item.quote?.trim() ? (
                      <blockquote className="text-body text-ink-600 mt-4">{item.quote}</blockquote>
                    ) : null}
                    <Caption name={item.name} note={item.note} />
                  </div>
                </figure>
              </li>
            )
          }

          if (index === featureIndex) {
            return (
              <li className="min-w-0 md:col-span-2 md:row-span-2" key={key}>
                <figure className="tile-lift flex h-full flex-col rounded-lg bg-green-900 p-8 shadow-md md:p-10">
                  <Quote aria-hidden="true" className="text-gold-400 size-9" strokeWidth={2} />
                  <blockquote className="text-cream mt-6 max-w-[34ch] text-[22px] leading-[1.45] font-semibold tracking-[-0.01em] text-balance md:text-[28px]">
                    {item.quote}
                  </blockquote>
                  <Caption dark name={item.name} note={item.note} />
                </figure>
              </li>
            )
          }

          const tone = LIGHT_TONES[lightTile++ % LIGHT_TONES.length]
          const isLong = isLongQuote(item)
          const isLast = index === lastPlain
          const mdSpan = isLong || (isLast && mdGap) ? 2 : 1
          const lgSpan = (isLong ? 2 : 1) + (isLast ? lgGap : 0)

          return (
            <li
              className={cn(
                'min-w-0',
                mdSpan === 2 && 'md:col-span-2',
                lgSpan === 1 && 'lg:col-span-1',
                lgSpan === 2 && 'lg:col-span-2',
                lgSpan >= 3 && 'lg:col-span-3',
              )}
              key={key}
            >
              <figure
                className={cn(
                  'tile-lift flex h-full flex-col rounded-lg p-6',
                  tone,
                  tone === 'bg-card' && 'shadow-sm',
                )}
              >
                <Quote aria-hidden="true" className="text-gold-600 size-6" strokeWidth={2} />
                <blockquote className="text-body text-ink-900 mt-4 max-w-[60ch]">
                  {item.quote}
                </blockquote>
                <Caption name={item.name} note={item.note} />
              </figure>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
