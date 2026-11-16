'use client'

import { Check, Minus, Plus, ShoppingBag, Zap } from 'lucide-react'
import React, { useState } from 'react'

import { CTA_BASE, CTA_VARIANTS } from '@/components/Cta'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import {
  CART_ADD_CTA,
  CART_ADDING,
  CART_QUANTITY_ADD_ONE,
  CART_QUANTITY_LABEL,
  CART_QUANTITY_REMOVE_ONE,
} from '@/utilities/cartCopy'
import { CART_MAX_QTY, ONE_TIME_DURATION } from '@/utilities/cart'
import { perDayPaise } from '@/utilities/leadPrice'
import { formatPaise } from '@/utilities/money'
import { cn } from '@/utilities/ui'
import { WHATSAPP_CTA_LABEL, whatsappHref } from '@/utilities/whatsapp'

import { useAddToCart } from './useAddToCart'

/**
 * The buy panel on one product's own page (spec 0007, AC-1 and AC-2), laid
 * out like a shop's: the price on one line with any old price and saving
 * beside it, the options as tiles, then one row with the quantity (a one-time
 * product or combo only), **Add to cart** (primary) and **Buy now**
 * (secondary, straight to checkout).
 *
 * Everything sits in one POST form. The tiles are native radios and the
 * quantity a plain number input, so every option renders and the form posts
 * without JavaScript. With it, Add to cart stays on the page (useAddToCart);
 * Buy now always posts natively, and the route sends it on to checkout.
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
   * panel: flat price, no option tiles, and a quantity stepper.
   */
  oneTimePrice?: number
  productSlug: string
  productTitle: string
  /** Where a plain form post returns to, so the shopper stays put. */
  returnPath?: string
  whatsapp?: null | string
}

const daysText = (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`

const STEP_BUTTON =
  'flex size-11 shrink-0 items-center justify-center text-green-700 transition-colors hover:bg-green-50 focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none disabled:opacity-40 disabled:hover:bg-transparent motion-reduce:transition-none'

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
  const [qty, setQty] = useState(1)

  const duration = durations[selected] ?? durations[0]
  const isOneTime = typeof oneTimePrice === 'number' && oneTimePrice >= 1

  // Hooks run before the early return below, so the hook order never changes.
  const { added, message, onSubmit, pending } = useAddToCart(
    { duration: isOneTime ? ONE_TIME_DURATION : (duration?.label ?? ''), product: productSlug },
    { oneTime: isOneTime },
  )

  if (!isOneTime && !duration) return null

  // A per-day rate only says something new when the option spans several
  // days; on a one-day option it would just repeat the price.
  const perDay =
    !isOneTime && duration && duration.days > 1 ? perDayPaise(duration.price, duration.days) : null
  const hasSaving =
    isOneTime && typeof compareAtPrice === 'number' && compareAtPrice > oneTimePrice
  const clamp = (value: number) => Math.min(CART_MAX_QTY, Math.max(1, value || 1))

  return (
    <div>
      {/* The price, said once. */}
      <div aria-live="polite">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[32px] leading-none font-extrabold tracking-[-0.01em] text-green-900 tabular-nums">
            {isOneTime ? formatPaise(oneTimePrice) : formatPaise(perDay ?? duration!.price)}
          </span>
          {!isOneTime && perDay !== null ? (
            <span className="text-ink-600 text-sm">a day</span>
          ) : null}
          {hasSaving ? (
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
        {isOneTime || perDay !== null ? (
          <p className="text-ink-600 mt-2 text-sm">
            {isOneTime
              ? combo
                ? 'One fixed price for the whole combo.'
                : 'Cooked fresh and delivered once.'
              : `${daysText(duration!.days)} of meals, ${formatPaise(duration!.price)} in all`}
          </p>
        ) : null}
      </div>

      <form action="/api/cart/add" className="mt-6" method="post" onSubmit={onSubmit}>
        <input name="product" type="hidden" value={productSlug} />
        <input name="return" type="hidden" value={returnPath} />
        {isOneTime ? <input name="duration" type="hidden" value={ONE_TIME_DURATION} /> : null}

        {/* The options as tiles, like a shop's size choice. Native radios. */}
        {!isOneTime ? (
          <fieldset>
            <legend className="text-sm font-bold text-green-900">
              Choose your plan<span className="sr-only"> for {productTitle}</span>
            </legend>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {durations.map((option, index) => {
                const optionPerDay =
                  option.days > 1 ? perDayPaise(option.price, option.days) : null

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
                        'border-line flex h-full min-h-20 flex-col items-center justify-center gap-0.5 rounded-lg border-2 bg-white px-3 py-3 text-center transition-colors',
                        'hover:border-green-500',
                        'peer-checked:border-green-700 peer-checked:bg-green-50',
                        'peer-focus-visible:ring-[3px] peer-focus-visible:ring-green-500 peer-focus-visible:ring-offset-2',
                        'motion-reduce:transition-none',
                      )}
                    >
                      <span className="text-ink-900 text-sm font-bold">{option.label}</span>
                      <span className="text-sm font-bold text-green-700 tabular-nums">
                        {formatPaise(option.price)}
                      </span>
                      {optionPerDay !== null ? (
                        <span className="text-caption text-ink-600 tabular-nums">
                          {formatPaise(optionPerDay)} a day
                        </span>
                      ) : null}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        ) : null}

        {/* Quantity, Add to cart and Buy now on one row. */}
        <div className={cn('flex flex-wrap items-center gap-3', !isOneTime && 'mt-6')}>
          {isOneTime ? (
            <div
              aria-label={CART_QUANTITY_LABEL}
              className="border-line rounded-pill flex items-center overflow-hidden border-2 bg-white"
              role="group"
            >
              <button
                aria-label={CART_QUANTITY_REMOVE_ONE}
                className={STEP_BUTTON}
                disabled={qty <= 1}
                onClick={() => setQty((value) => clamp(value - 1))}
                type="button"
              >
                <Minus aria-hidden="true" className="size-4" strokeWidth={2.5} />
              </button>
              <input
                aria-label={`${CART_QUANTITY_LABEL} of ${productTitle}`}
                className="text-ink-900 h-11 w-10 [appearance:textfield] bg-transparent text-center font-bold tabular-nums focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                inputMode="numeric"
                max={CART_MAX_QTY}
                min={1}
                name="qty"
                onChange={(event) => setQty(clamp(Number(event.target.value)))}
                type="number"
                value={qty}
              />
              <button
                aria-label={CART_QUANTITY_ADD_ONE}
                className={STEP_BUTTON}
                disabled={qty >= CART_MAX_QTY}
                onClick={() => setQty((value) => clamp(value + 1))}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" strokeWidth={2.5} />
              </button>
            </div>
          ) : null}

          <button
            className={cn(CTA_BASE, CTA_VARIANTS.primary, 'min-w-40 flex-1 px-5')}
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

          <button
            className={cn(CTA_BASE, CTA_VARIANTS.secondary, 'min-w-36 flex-1 px-5')}
            name="buyNow"
            type="submit"
            value="true"
          >
            <Zap aria-hidden="true" className="size-4" strokeWidth={2} />
            Buy now
          </button>
        </div>

        <p aria-live="polite" className="text-ink-600 mt-3 min-h-5 text-sm">
          {message}
        </p>
      </form>

      {whatsapp ? (
        <a
          className="mt-1 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-green-700 underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none"
          href={whatsappHref(whatsapp)}
          rel="noopener noreferrer"
          target="_blank"
        >
          <WhatsAppIcon className="size-4" />
          {WHATSAPP_CTA_LABEL}
        </a>
      ) : null}
    </div>
  )
}
