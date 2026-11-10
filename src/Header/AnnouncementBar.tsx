import { ArrowRight, Leaf } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

type Announcement = NonNullable<HeaderType['announcement']>

interface Props {
  announcement?: Announcement | null
}

/**
 * The strip above the navbar (design.md §6.2). It pins to the top of the viewport
 * together with the bar beneath it, and shows only while the page sits at the
 * top; the header tucks it away as soon as the visitor scrolls.
 *
 * The whole bar is one link, so the tap target is the full strip rather than a
 * small word inside it (design.md §12). The focus ring is drawn inside the strip
 * (`-outline-offset`), because the wrapper that collapses it clips everything
 * outside. The link's arrow nudges forward on hover, and the strip settles in
 * with a short fade on load — both quiet, and both switched off for
 * reduced motion. No countdown and no invented scarcity (design.md §1).
 */
export const AnnouncementBar: React.FC<Props> = ({ announcement }) => {
  const { enabled, linkLabel, linkUrl, newTab, note, text } = announcement ?? {}

  if (!enabled || !linkUrl || (!text && !note)) return null

  const newTabProps = newTab ? { rel: 'noopener noreferrer', target: '_blank' } : {}

  return (
    <Link
      className="group bg-green-900 text-cream hover:bg-green-800 animate-in fade-in slide-in-from-top-1 fill-mode-both block duration-300 ease-out transition-colors focus-visible:-outline-offset-3 focus-visible:outline-3 focus-visible:outline-gold-400 focus-visible:outline-solid motion-reduce:animate-none motion-reduce:transition-none"
      href={linkUrl}
      {...newTabProps}
    >
      <div className="container flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 py-3 text-center">
        {text ? (
          <span className="text-caption text-gold-400 inline-flex items-center gap-2 font-bold">
            <Leaf aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
            {text}
          </span>
        ) : null}
        {note ? <span className="text-caption text-cream/70">{note}</span> : null}
        {linkLabel ? (
          <span className="text-caption text-gold-400 inline-flex items-center gap-1 underline decoration-gold-400/70 underline-offset-4 transition-[color,text-decoration-color] duration-200 group-hover:text-gold-300 group-hover:decoration-gold-300 motion-reduce:transition-none">
            {linkLabel}
            <ArrowRight
              aria-hidden="true"
              className="size-3.5 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
              strokeWidth={2.5}
            />
          </span>
        ) : null}
      </div>
    </Link>
  )
}
