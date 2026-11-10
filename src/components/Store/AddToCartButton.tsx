'use client'

import { ShoppingBag } from 'lucide-react'
import React from 'react'

import { CTA_BASE, CTA_SIZES, CTA_VARIANTS } from '@/components/Cta'
import { CART_ADD_CTA, CART_ADDING } from '@/utilities/cartCopy'
import { cn } from '@/utilities/ui'

import { useAddToCart } from './useAddToCart'

/**
 * The buy control on a photo-first product card (design.md §6.15).
 *
 * The card carries no duration menu — it adds the kitchen's default duration,
 * the first one on the record, and the product's own page holds the choice.
 * The control is one gold pill sitting in the photo's gradient band beside the
 * lead price, revealed on hover or focus on a fine pointer (`.card-reveal`)
 * and simply visible on touch, so a resting shelf stays quiet without ever
 * hiding the way to buy. It is a plain POST form, so it adds without
 * JavaScript; with JavaScript it adds in place and answers in one polite line.
 *
 * That answer and the lead price share one live line: the price rests there,
 * and a confirmation or refusal replaces it for a moment. The band is a
 * pass-through surface — clicks fall through it to the card's stretched link —
 * so the form opts itself back in for its own pill.
 *
 * The browser never sends a price or a day count: the endpoint resolves the
 * product slug and the duration label against the live record.
 */
export const AddToCartButton: React.FC<{
  durationLabel: string
  /** The resting text of the shared line — the card's per-day lead price. */
  priceLine?: string
  productSlug: string
  returnPath: string
}> = ({ durationLabel, priceLine, productSlug, returnPath }) => {
  const { message, onSubmit, pending } = useAddToCart({
    duration: durationLabel,
    product: productSlug,
  })

  return (
    <div className="pointer-events-none flex items-end justify-between gap-3">
      <p aria-live="polite" className="text-cream/90 mt-1.5 min-h-5 text-sm font-bold tracking-tight">
        {message ?? priceLine}
      </p>

      <form
        action="/api/cart/add"
        className="pointer-events-auto shrink-0"
        method="post"
        onSubmit={onSubmit}
      >
        <input name="product" type="hidden" value={productSlug} />
        <input name="duration" type="hidden" value={durationLabel} />
        <input name="return" type="hidden" value={returnPath} />

        <button
          className={cn(CTA_BASE, CTA_SIZES.small, CTA_VARIANTS.onDark, 'card-reveal')}
          disabled={pending}
          type="submit"
        >
          <ShoppingBag aria-hidden="true" className="size-4" strokeWidth={2} />
          {pending ? CART_ADDING : CART_ADD_CTA}
        </button>
      </form>
    </div>
  )
}
