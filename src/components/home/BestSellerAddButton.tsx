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
    <div className="mt-auto pt-4">
      <form action="/api/cart/add" method="post" onSubmit={onSubmit}>
        <input name="product" type="hidden" value={productSlug} />
        <input name="duration" type="hidden" value={oneTime ? ONE_TIME_DURATION : durationLabel} />
        <input name="return" type="hidden" value="/" />

        <button
          aria-label={`Add ${productTitle} to cart`}
          className={cn(CTA_BASE, CTA_SIZES.small, CTA_VARIANTS.secondary, 'w-24 uppercase')}
          disabled={pending}
          type="submit"
        >
          {pending ? 'Adding' : 'Add'}
        </button>
      </form>

      <p aria-live="polite" className="text-ink-600 mt-2 min-h-5 text-sm">
        {message}
      </p>
    </div>
  )
}
