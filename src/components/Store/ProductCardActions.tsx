'use client'

import { Check, ShoppingBag } from 'lucide-react'
import React from 'react'

import { CTA_BASE, CTA_SIZES, CTA_VARIANTS } from '@/components/Cta'
import { useAddToCart } from './useAddToCart'
import { ONE_TIME_DURATION } from '@/utilities/cart'
import { cn } from '@/utilities/ui'

/**
 * The two buy controls at the foot of every product card: **Add to cart**
 * (primary) and **Buy now** (secondary, straight to checkout). Both are plain
 * POST forms, so they work without JavaScript; with it, Add to cart stays on
 * the page and announces the result in the live line below.
 */
export const ProductCardActions: React.FC<{
  durationLabel: string
  oneTime: boolean
  productSlug: string
  productTitle: string
  /** Where a plain (no JavaScript) add returns to, so the shopper stays put. */
  returnPath?: string
}> = ({ durationLabel, oneTime, productSlug, productTitle, returnPath = '/' }) => {
  const { added, message, onSubmit, pending } = useAddToCart(
    { duration: oneTime ? ONE_TIME_DURATION : durationLabel, product: productSlug },
    { oneTime },
  )

  return (
    <div className="grid gap-2">
      <form action="/api/cart/add" method="post" onSubmit={onSubmit}>
        <input name="product" type="hidden" value={productSlug} />
        <input name="duration" type="hidden" value={oneTime ? ONE_TIME_DURATION : durationLabel} />
        <input name="return" type="hidden" value={returnPath} />

        <button
          aria-label={`Add ${productTitle} to cart`}
          className={cn(
            CTA_BASE,
            CTA_SIZES.small,
            CTA_VARIANTS.primary,
            'w-full px-1 text-xs uppercase',
          )}
          disabled={pending}
          type="submit"
        >
          {added ? (
            <Check aria-hidden="true" className="animate-pop size-4" strokeWidth={2.5} />
          ) : (
            <ShoppingBag aria-hidden="true" className="size-4" strokeWidth={2} />
          )}
          {pending ? 'Adding' : added ? 'Added' : 'Add to cart'}
        </button>
      </form>

      <form action="/api/cart/add" method="post">
        <input name="product" type="hidden" value={productSlug} />
        <input name="duration" type="hidden" value={oneTime ? ONE_TIME_DURATION : durationLabel} />
        <input name="return" type="hidden" value="/checkout" />
        <input name="buyNow" type="hidden" value="true" />

        <button
          aria-label={`Buy ${productTitle} now`}
          className={cn(
            CTA_BASE,
            CTA_SIZES.small,
            CTA_VARIANTS.secondary,
            'w-full px-1 text-xs uppercase',
          )}
          type="submit"
        >
          Buy now
        </button>
      </form>

      <p aria-live="polite" className={cn('text-ink-600 text-sm', message ? '' : 'sr-only')}>
        {message}
      </p>
    </div>
  )
}
