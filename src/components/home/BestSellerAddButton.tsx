'use client'

import React from 'react'

import { CTA_BASE, CTA_SIZES, CTA_VARIANTS } from '@/components/Cta'
import { useAddToCart } from '@/components/Store/useAddToCart'
import { ONE_TIME_DURATION } from '@/utilities/cart'
import { cn } from '@/utilities/ui'

export const BestSellerAddButton: React.FC<{
  durationLabel: string
  oneTime: boolean
  productSlug: string
  productTitle: string
}> = ({ durationLabel, oneTime, productSlug, productTitle }) => {
  const { message, onSubmit, pending } = useAddToCart(
    { duration: oneTime ? ONE_TIME_DURATION : durationLabel, product: productSlug },
    { oneTime },
  )

  return (
    <div className="flex min-h-11 items-center gap-3">
      <form action="/api/cart/add" method="post" onSubmit={onSubmit}>
        <input name="product" type="hidden" value={productSlug} />
        <input name="duration" type="hidden" value={oneTime ? ONE_TIME_DURATION : durationLabel} />
        <input name="return" type="hidden" value="/" />

        <button
          aria-label={`Add ${productTitle} to cart`}
          className={cn(
            CTA_BASE,
            CTA_SIZES.small,
            CTA_VARIANTS.secondary,
            'w-24 shrink-0 uppercase',
          )}
          disabled={pending}
          type="submit"
        >
          {pending ? 'Adding' : 'Add'}
        </button>
      </form>

      <p aria-live="polite" className="text-ink-600 min-w-0 flex-1 text-sm">
        {message}
      </p>
    </div>
  )
}
