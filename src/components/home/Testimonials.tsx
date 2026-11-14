import { Quote } from 'lucide-react'
import React from 'react'

import type { Media, Testimonial as TestimonialsGlobal } from '@/payload-types'

import { getCachedGlobal } from '@/utilities/getGlobals'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { TESTIMONIALS_HEADING } from '@/utilities/homeCopy'

import { Section } from './Section'

type Item = NonNullable<TestimonialsGlobal['items']>[number]

const asMedia = (value: Item['video']): Media | null =>
  value && typeof value === 'object' ? value : null

const Caption: React.FC<{ name: string; note?: string | null }> = ({ name, note }) => (
  <figcaption className="mt-4">
    <span className="text-caption text-ink-900 font-bold">{name}</span>
    {note?.trim() ? <span className="text-caption text-ink-600"> · {note}</span> : null}
  </figcaption>
)

/**
 * Customer words, edited in the admin under Home page → Testimonials. Each entry is
 * a written quote or a short video. The section renders nothing until at least one
 * entry is published, so the home page never shows placeholder proof (design.md §11).
 */
export const Testimonials: React.FC = async () => {
  const global = (await getCachedGlobal('testimonials', 1)()) as TestimonialsGlobal | null

  const items = (global?.items ?? []).filter((item) => {
    if (!item.name?.trim()) return false
    if (item.kind === 'video') return Boolean(asMedia(item.video)?.url)
    return Boolean(item.quote?.trim())
  })

  if (!items.length) return null

  return (
    <Section id="testimonials">
      <h2 className="text-h2">{global?.heading?.trim() || TESTIMONIALS_HEADING}</h2>

      <div className="mt-10 grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          if (item.kind === 'video') {
            const video = asMedia(item.video)!
            const poster = asMedia(item.poster)

            return (
              <figure className="bg-card rounded-md p-4 shadow-sm" key={item.id ?? item.name}>
                <video
                  aria-label={`Video testimonial from ${item.name}`}
                  className="bg-green-900 aspect-[4/5] w-full rounded-sm object-contain"
                  controls
                  playsInline
                  poster={poster?.url ? getMediaUrl(poster.url) : undefined}
                  preload="metadata"
                  src={getMediaUrl(video.url)}
                />

                <div className="px-2 pb-2">
                  {item.quote?.trim() ? (
                    <blockquote className="text-body text-ink-600 mt-4">{item.quote}</blockquote>
                  ) : null}
                  <Caption name={item.name} note={item.note} />
                </div>
              </figure>
            )
          }

          return (
            <figure className="bg-card rounded-md p-6 shadow-sm" key={item.id ?? item.name}>
              <Quote aria-hidden="true" className="text-gold-400 size-6" strokeWidth={2} />
              <blockquote className="text-body text-ink-600 mt-4">{item.quote}</blockquote>
              <Caption name={item.name} note={item.note} />
            </figure>
          )
        })}
      </div>
    </Section>
  )
}
