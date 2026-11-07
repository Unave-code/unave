'use client'

import { Baby, HeartPulse, LayoutGrid, UserRound, type LucideIcon } from 'lucide-react'
import React, { useState } from 'react'

import { Cta } from '@/components/Cta'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import type { Product } from '@/payload-types'
import {
  AUDIENCE_FILTER_LABEL,
  AUDIENCE_FILTER_ORDER,
  PRODUCTS_CATEGORY_FILTER_EMPTY_BODY,
  PRODUCTS_CATEGORY_FILTER_EMPTY_HEADING,
  type ProductAudienceFilterValue,
} from '@/utilities/productsCategoryCopy'
import {
  PRODUCTS_CTA_MESSAGE,
  PRODUCTS_EMPTY_BODY,
  PRODUCTS_EMPTY_HEADING,
} from '@/utilities/productsCopy'
import { whatsappHref } from '@/utilities/whatsapp'

/**
 * The audience filter on a category page (spec 0008, AC-2, AC-3 and AC-11).
 *
 * One row of icon pills (All, Kids, Adults, Special), each a 44px pill carrying
 * its icon beside its label. Choosing one filters the visible cards in the
 * browser, with no page reload and no change to the address.
 *
 * The grid is server rendered and stays that way: the cards arrive here as
 * ready made nodes, and this component only decides which ones are visible. The
 * pills follow design.md's accessibility rules: a labelled group, a pressed
 * state on every choice, 44px targets, the visible label as the accessible
 * name, a polite live region that announces how many products match, and no
 * motion.
 *
 * Two empty states, so the words never lie (spec 0008, AC-3): when the category
 * has no products at all, the products page empty state shows; when only the
 * chosen filter comes up empty, the filter specific one does. Both sit centered
 * under the pills.
 */
export interface ProductFilterCard {
  audience: null | Product['audience']
  id: string | number
  node: React.ReactNode
}

/** The code art for the audience row, one icon per choice. */
const AUDIENCE_FILTER_ICON: Record<ProductAudienceFilterValue, LucideIcon> = {
  adults: UserRound,
  all: LayoutGrid,
  kids: Baby,
  special: HeartPulse,
}

const AUDIENCE_PILL_BASE =
  'rounded-pill inline-flex h-11 items-center gap-2 border-2 px-4 text-sm font-bold transition-colors focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none'

const AUDIENCE_PILL_ON = 'border-green-700 bg-green-700 text-cream focus-visible:ring-green-500'
const AUDIENCE_PILL_OFF =
  'border-line bg-card text-green-700 hover:border-green-700 hover:bg-green-50 focus-visible:ring-green-500'

const audiencePillClass = (pressed: boolean) =>
  `${AUDIENCE_PILL_BASE} ${pressed ? AUDIENCE_PILL_ON : AUDIENCE_PILL_OFF}`

/** One empty state card, centered under the pills. */
const EmptyCard: React.FC<{ body: string; heading: string; whatsapp?: null | string }> = ({
  body,
  heading,
  whatsapp,
}) => (
  <div className="border-line mx-auto mt-10 max-w-[52ch] rounded-2xl border p-8 text-center">
    <h3 className="text-h3">{heading}</h3>
    <p className="text-body text-ink-600 mt-3">{body}</p>

    {whatsapp ? (
      <div className="mt-6 flex justify-center">
        <Cta
          href={whatsappHref(whatsapp)}
          rel="noopener noreferrer"
          target="_blank"
          variant="secondary"
        >
          <WhatsAppIcon className="size-4" />
          {PRODUCTS_CTA_MESSAGE}
        </Cta>
      </div>
    ) : null}
  </div>
)

export const ProductFilters: React.FC<{
  cards: ProductFilterCard[]
  whatsapp?: null | string
}> = ({ cards, whatsapp }) => {
  const [audience, setAudience] = useState<ProductAudienceFilterValue>('all')

  const visible = cards.filter(
    (card) => audience === 'all' || card.audience === audience,
  )

  const countText = visible.length === 1 ? '1 product shown' : `${visible.length} products shown`

  return (
    <div>
      <div
        aria-label="Filter the products by audience"
        className="flex flex-wrap items-center justify-center gap-2"
        role="group"
      >
        {AUDIENCE_FILTER_ORDER.map((value) => {
          const pressed = audience === value
          const Icon = AUDIENCE_FILTER_ICON[value]

          return (
            <button
              aria-pressed={pressed}
              className={audiencePillClass(pressed)}
              key={value}
              onClick={() => setAudience(value)}
              type="button"
            >
              <Icon aria-hidden="true" className="size-4" />
              {AUDIENCE_FILTER_LABEL[value]}
            </button>
          )
        })}
      </div>

      <p aria-live="polite" className="sr-only">
        {countText}.
      </p>

      {visible.length > 0 ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((card) => (
            <React.Fragment key={card.id}>{card.node}</React.Fragment>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <EmptyCard
          body={PRODUCTS_EMPTY_BODY}
          heading={PRODUCTS_EMPTY_HEADING}
          whatsapp={whatsapp}
        />
      ) : (
        <EmptyCard
          body={PRODUCTS_CATEGORY_FILTER_EMPTY_BODY}
          heading={PRODUCTS_CATEGORY_FILTER_EMPTY_HEADING}
          whatsapp={whatsapp}
        />
      )}
    </div>
  )
}
