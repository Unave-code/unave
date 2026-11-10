'use client'

import { ShoppingBag } from 'lucide-react'
import React, { useState } from 'react'

import { CTA_BASE, CTA_VARIANTS } from '@/components/Cta'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { CART_ADD_CTA, CART_ADDING } from '@/utilities/cartCopy'
import { formatPaise } from '@/utilities/money'
import { cn } from '@/utilities/ui'
import { WHATSAPP_CTA_LABEL, whatsappHref } from '@/utilities/whatsapp'

import { useAddToCart } from './useAddToCart'

/**
 * The price panel on one product's own page (spec 0007, AC-1 and AC-2).
 *
 * Laid out like a pricing card: the chosen duration's per day price leads, the
 * duration chips carry every total at once, and one full width control adds the
 * chosen line to the cart. The chips are native radios inside a POST form, so
 * every duration and price renders without JavaScript and adding a line is a
 * plain form post that redirects back. The add behaviour itself lives in
 * useAddToCart, shared with the card's button.
 *
 * The browser never sends a price or a day count: the endpoint resolves the
 * product slug and duration label against the live record.
 */

export type ProductDuration = {
  days: number
  label: string
  price: number
}

export type ProductPurchaseProps = {
  durations: ProductDuration[]
  productSlug: string
  productTitle: string
  /** Where a plain form post returns to, so the shelf stays put. */
  returnPath?: string
  whatsapp?: null | string
}

export const ProductPurchase: React.FC<ProductPurchaseProps> = ({
  durations,
  productSlug,
  productTitle,
  returnPath = '/products',
  whatsapp,
}) => {
  const [selected, setSelected] = useState(0)

  const duration = durations[selected] ?? durations[0]

  // Hooks run before the early return below, so the panel's shape never
  // changes the hook order between renders.
  const { message, onSubmit, pending } = useAddToCart({
    duration: duration?.label ?? '',
    product: productSlug,
  })

  if (!duration) return null

  const perDay = duration.days > 0 ? Math.round(duration.price / duration.days) : null

  return (
    /* The panel is a quiet card of its own: a hairline box that reads as the
       one object to act on while it stays pinned beside the scrolling photo
       and description. */
    <div className="border-line bg-card rounded-2xl border p-6 sm:p-8">
      <div aria-live="polite">
        <p className="flex items-baseline gap-1.5">
          <span className="text-green-700 text-4xl leading-none font-bold tracking-tight sm:text-5xl">
            {formatPaise(perDay ?? duration.price)}
          </span>
          {perDay !== null ? <span className="text-ink-600 text-sm">a day</span> : null}
        </p>

        <p className="text-ink-600 mt-2 text-sm">
          {duration.days} {duration.days === 1 ? 'day' : 'days'} of meals,{' '}
          {formatPaise(duration.price)} in all
        </p>
      </div>

      <form action="/api/cart/add" className="mt-6" method="post" onSubmit={onSubmit}>
        <input name="product" type="hidden" value={productSlug} />
        <input name="return" type="hidden" value={returnPath} />

        <fieldset>
          <legend className="sr-only">Choose a duration for {productTitle}</legend>

          <div className="flex flex-wrap gap-2">
            {durations.map((option, index) => (
              <label className="cursor-pointer" key={`${option.label}-${index}`}>
                <input
                  checked={selected === index}
                  className="peer sr-only"
                  name="duration"
                  onChange={() => setSelected(index)}
                  type="radio"
                  value={option.label}
                />

                <span
                  className={cn(
                    'rounded-pill border-line text-green-700 hover:border-green-700 flex min-h-11 items-center gap-2 border bg-white px-4 text-sm font-semibold transition-colors',
                    'peer-checked:border-gold-400 peer-checked:bg-gold-400 peer-checked:text-green-900',
                    'peer-focus-visible:ring-green-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-[3px]',
                    'motion-reduce:transition-none',
                  )}
                >
                  {option.label}

                  <span className="opacity-80">{formatPaise(option.price)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 flex flex-col gap-2">
          <button
            className={cn(CTA_BASE, CTA_VARIANTS.primary, 'w-full')}
            disabled={pending}
            type="submit"
          >
            <ShoppingBag aria-hidden="true" className="size-4" strokeWidth={2} />
            {pending ? CART_ADDING : CART_ADD_CTA}
          </button>

          {whatsapp ? (
            <a
              className={cn(CTA_BASE, CTA_VARIANTS.secondary, 'w-full')}
              href={whatsappHref(whatsapp)}
              rel="noopener noreferrer"
              target="_blank"
            >
              <WhatsAppIcon className="size-4" />
              {WHATSAPP_CTA_LABEL}
            </a>
          ) : null}
        </div>

        <p aria-live="polite" className="text-ink-600 mt-3 min-h-5 text-sm">
          {message}
        </p>
      </form>
    </div>
  )
}
