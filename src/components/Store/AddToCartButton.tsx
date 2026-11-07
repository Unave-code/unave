'use client'

import { ShoppingBag } from 'lucide-react'
import React from 'react'

import { CTA_BASE, CTA_SIZES, CTA_VARIANTS } from '@/components/Cta'
import { CART_ADD_CTA, CART_ADDING } from '@/utilities/cartCopy'
import { cn } from '@/utilities/ui'

import { useAddToCart } from './useAddToCart'

/**
 * The one Add to cart control on a product card (spec 0007, AC-2).
 *
 * The card shows the first duration's price, so this adds exactly that line:
 * the product slug and the first duration's label, both resolved against the
 * live record on the server. It is a plain POST form, so it adds without
 * JavaScript; with JavaScript it adds in place and answers in one polite line.
 * The button sits beside the card's link, never inside it, so the card can be
 * both opened and bought from.
 */
export const AddToCartButton: React.FC<{
  durationLabel: string
  productSlug: string
  returnPath: string
}> = ({ durationLabel, productSlug, returnPath }) => {
  const { message, onSubmit, pending } = useAddToCart({
    duration: durationLabel,
    product: productSlug,
  })

  return (
    <form action="/api/cart/add" method="post" onSubmit={onSubmit}>
      <input name="product" type="hidden" value={productSlug} />
      <input name="duration" type="hidden" value={durationLabel} />
      <input name="return" type="hidden" value={returnPath} />

      <button
        className={cn(CTA_BASE, CTA_SIZES.small, CTA_VARIANTS.primary, 'w-full')}
        disabled={pending}
        type="submit"
      >
        <ShoppingBag aria-hidden="true" className="size-4" strokeWidth={2} />
        {pending ? CART_ADDING : CART_ADD_CTA}
      </button>

      <p aria-live="polite" className="text-ink-600 mt-2 min-h-5 text-sm">
        {message}
      </p>
    </form>
  )
}
