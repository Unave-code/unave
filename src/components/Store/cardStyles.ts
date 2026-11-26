import { CTA_BASE, CTA_SIZES, CTA_VARIANTS } from '@/components/Cta'
import { cn } from '@/utilities/ui'

/**
 * The shop card's parts (design.md §6.15), shared by the product card and the
 * meal plan card so the two shelves read as one shop.
 */
export const CARD_FRAME =
  'group bg-card flex h-full flex-col overflow-hidden rounded-lg p-2 shadow-sm transition-[box-shadow,translate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0'

export const CARD_PHOTO_LINK =
  'relative block aspect-square overflow-hidden rounded-md bg-green-50'

export const CARD_PHOTO_ZOOM =
  'object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100'

export const CARD_BODY =
  'flex flex-1 flex-col px-2 pt-3 pb-1'

export const CARD_EYEBROW =
  'text-ink-600 flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase'

export const CARD_TITLE =
  'text-body text-ink-900 mt-1 line-clamp-2 leading-snug font-semibold'

export const CARD_TITLE_LINK =
  'rounded-sm underline-offset-4 hover:text-green-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700'

export const CARD_SUBLINE =
  'text-ink-600 mt-1 line-clamp-2 text-xs leading-5'

export const CARD_PRICE =
  'text-body font-bold text-green-700 tabular-nums'

export const CARD_ACTIONS =
  'mt-auto pt-3'

/** The card's one full-width button to the item's own page. */
export const CARD_CTA = cn(CTA_BASE, CTA_SIZES.small, CTA_VARIANTS.primary, 'w-full px-1 text-xs uppercase')
