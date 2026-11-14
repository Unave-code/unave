'use client'

import { Check, ShoppingBag } from 'lucide-react'
import React, { useState } from 'react'

import { CTA_BASE, CTA_VARIANTS } from '@/components/Cta'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { CART_ADD_CTA, CART_ADDING } from '@/utilities/cartCopy'
import { ONE_TIME_DURATION } from '@/utilities/cart'
import { perDayPaise } from '@/utilities/leadPrice'
import { formatPaise } from '@/utilities/money'
import { PRODUCT_ONE_TIME_LABEL } from '@/utilities/productsCopy'
import { cn } from '@/utilities/ui'
import { WHATSAPP_CTA_LABEL, whatsappHref } from '@/utilities/whatsapp'

import { useAddToCart } from './useAddToCart'

/**
 * The buy panel on one product's own page (spec 0007, AC-1 and AC-2).
 *
 * Bare and hairline-divided: the chosen duration's per day price leads, a
 * hairline, the duration chips carrying every total at once, a hairline, and
 * one full width control that adds the chosen line to the cart — nothing
 * boxed around them. The chips are native radios inside a POST form, so every
 * duration and price renders without JavaScript and adding a line is a plain
 * form post that redirects back. The add behaviour itself lives in
 * useAddToCart, shared with the card's button.
 *
 * A one-time purchase (a `oneTimePrice` on the props) renders the same bare
 * panel with one price and no chips: no duration is chosen, the reserved
 * duration travels in a hidden input, and adding what is already in the cart
 * raises the quantity rather than being refused.
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
  combo?: boolean
  /** A one-time product's old price, in paise, shown struck through when higher. */
  compareAtPrice?: null | number
  /** The plan's durations. Empty by construction on a one-time purchase. */
  durations: ProductDuration[]
  /**
   * A one-time purchase's single price, in paise. Its presence switches the
   * whole panel: flat price, no duration chips, and the reserved duration
   * posted so adding what is already there bumps the quantity.
   */
  oneTimePrice?: number
  productSlug: string
  productTitle: string
  /** Where a plain form post returns to, so the shelf stays put. */
  returnPath?: string
  whatsapp?: null | string
}

export const ProductPurchase: React.FC<ProductPurchaseProps> = ({
  combo = false,
  compareAtPrice,
  durations,
  oneTimePrice,
  productSlug,
  productTitle,
  returnPath = '/products',
  whatsapp,
}) => {
  const [selected, setSelected] = useState(0)

  const duration = durations[selected] ?? durations[0]
  const isOneTime = typeof oneTimePrice === 'number' && oneTimePrice >= 1

  // Hooks run before the early return below, so the panel's shape never
  // changes the hook order between renders.
  const { added, message, onSubmit, pending } = useAddToCart(
    { duration: isOneTime ? ONE_TIME_DURATION : (duration?.label ?? ''), product: productSlug },
    { oneTime: isOneTime },
  )

  if (isOneTime) {
    return (
      <div>
        <div aria-live="polite">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[34px] leading-none font-extrabold tracking-[-0.01em] text-green-900 tabular-nums">
              {formatPaise(oneTimePrice)}
            </span>
            {typeof compareAtPrice === 'number' && compareAtPrice > oneTimePrice ? (
              <>
                <del className="text-ink-600 text-body tabular-nums">
                  {formatPaise(compareAtPrice)}
                </del>
                <span className="rounded-pill bg-gold-100 px-2.5 py-1 text-xs font-bold text-green-900">
                  {Math.floor(((compareAtPrice - oneTimePrice) / compareAtPrice) * 100)}% OFF
                </span>
              </>
            ) : null}
          </p>
          <p className="text-ink-600 mt-2 text-sm">
            {combo
              ? 'A fixed price combo. Adding it again raises the quantity, up to ten.'
              : `${PRODUCT_ONE_TIME_LABEL} — cooked fresh and delivered once. Adding it again raises the quantity, up to ten.`}
          </p>
        </div>

        <form action="/api/cart/add" className="mt-5" method="post" onSubmit={onSubmit}>
          <input name="product" type="hidden" value={productSlug} />
          <input name="duration" type="hidden" value={ONE_TIME_DURATION} />
          <input name="return" type="hidden" value={returnPath} />

          <div className="border-line mt-5 flex flex-col gap-2 border-t pt-5">
            <button
              className={cn(CTA_BASE, CTA_VARIANTS.primary, 'w-full')}
              disabled={pending}
              type="submit"
            >
              {added ? (
                <Check aria-hidden="true" className="animate-pop size-4" strokeWidth={2.5} />
              ) : (
                <ShoppingBag aria-hidden="true" className="size-4" strokeWidth={2} />
              )}
              {pending ? CART_ADDING : added ? 'Added' : CART_ADD_CTA}
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

  if (!duration) return null

  const perDay = duration.days > 0 ? perDayPaise(duration.price, duration.days) : null

  return (
    /* The panel is bare: the price, the chips and the control sit directly on
       the page, divided by hairlines, while the column stays pinned beside the
       reading. */
    <div>
      <div aria-live="polite">
        <p className="flex items-baseline gap-1.5">
          <span className="text-[34px] leading-none font-extrabold tracking-[-0.01em] text-green-900 tabular-nums">
            {formatPaise(perDay ?? duration.price)}
          </span>
          {perDay !== null ? <span className="text-ink-600 text-sm">a day</span> : null}
        </p>

        <p className="text-ink-600 mt-2 text-sm">
          {duration.days} {duration.days === 1 ? 'day' : 'days'} of meals,{' '}
          {formatPaise(duration.price)} in all
        </p>
      </div>

      <form action="/api/cart/add" className="mt-5" method="post" onSubmit={onSubmit}>
        <input name="product" type="hidden" value={productSlug} />
        <input name="return" type="hidden" value={returnPath} />

        <fieldset className="border-line border-t pt-5">
          <legend className="sr-only">Choose a duration for {productTitle}</legend>

          {/* Every duration is a full-width row: its name and days on the
              left, its total and per-day rate on the right, so choosing one
              is also comparing them. Native radios underneath. */}
          <div className="flex flex-col gap-2">
            {durations.map((option, index) => {
              const optionPerDay = option.days > 0 ? Math.round(option.price / option.days) : null

              return (
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
                      'border-line flex min-h-14 items-center gap-3 rounded-lg border bg-white px-4 py-3 transition-colors',
                      'hover:border-green-700',
                      'peer-checked:border-green-700 peer-checked:bg-green-50 peer-checked:shadow-[inset_0_0_0_1px_var(--color-green-700)]',
                      'peer-focus-visible:ring-green-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-[3px]',
                      'motion-reduce:transition-none',
                      'peer-checked:[&_.radio-dot]:border-green-700 peer-checked:[&_.radio-dot]:border-[6px]',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="radio-dot border-ink-600/40 size-5 shrink-0 rounded-full border-2 bg-white transition-[border-width] duration-150 motion-reduce:transition-none"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-ink-900 block text-sm font-bold">{option.label}</span>
                      <span className="text-caption text-ink-600">
                        {option.days} {option.days === 1 ? 'day' : 'days'} of meals
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold text-green-900 tabular-nums">
                        {formatPaise(option.price)}
                      </span>
                      {optionPerDay !== null ? (
                        <span className="text-caption text-ink-600 tabular-nums">
                          {formatPaise(optionPerDay)} a day
                        </span>
                      ) : null}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="border-line mt-5 flex flex-col gap-2 border-t pt-5">
          <button
            className={cn(CTA_BASE, CTA_VARIANTS.primary, 'w-full')}
            disabled={pending}
            type="submit"
          >
            {added ? (
              <Check aria-hidden="true" className="animate-pop size-4" strokeWidth={2.5} />
            ) : (
              <ShoppingBag aria-hidden="true" className="size-4" strokeWidth={2} />
            )}
            {pending ? CART_ADDING : added ? 'Added' : CART_ADD_CTA}
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
