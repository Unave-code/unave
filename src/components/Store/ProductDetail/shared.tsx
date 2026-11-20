import React from 'react'

import type { Media as MediaDoc, Product } from '@/payload-types'
import { getMediaUrl } from '@/utilities/getMediaUrl'

export const CHIP =
  'rounded-pill inline-flex min-h-7 items-center px-3 text-xs font-bold tracking-wide uppercase'

export type ComboItem = {
  days?: null | number
  durationLabel?: null | string
  image: MediaDoc | null
  slug: null | string
  title: string
  type: null | Product['type']
}

export const mediaOf = (value: Product['image']): MediaDoc | null =>
  value && typeof value === 'object' && value.url ? value : null

export const srcOf = (media: MediaDoc): string => getMediaUrl(media.url, media.updatedAt)

export const daysText = (days?: null | number) => (days ? `${days} ${days === 1 ? 'day' : 'days'}` : '')

/** A section heading inside the page's columns. */
export const ColumnHeading: React.FC<{ children: React.ReactNode; id: string }> = ({ children, id }) => (
  <h2 className="text-body text-green-900 font-bold" id={id}>
    {children}
  </h2>
)
