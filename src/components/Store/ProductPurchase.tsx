'use client'

import { Check, ShoppingBag, Zap } from 'lucide-react'
import React, { useState } from 'react'

import { CTA_BASE, CTA_VARIANTS } from '@/components/Cta'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { CART_ADD_CTA, CART_ADDING } from '@/utilities/cartCopy'
import { ONE_TIME_DURATION } from '@/utilities/cart'
import { daysLabel } from '@/utilities/orderDisplay'
import { formatPaise } from '@/utilities/money'
import { cn } from '@/utilities/ui'
import { WHATSAPP_CTA_LABEL, whatsappHref } from '@/utilities/whatsapp'

import type { ProductAddon } from '@/utilities/addons'
import type { ProductSize } from '@/utilities/cartLines'

import { OptionTiles, TILE_PRICE, TILE_SUB, TileDot } from './OptionTiles'
import { QuantityStepper } from './QuantityStepper'
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
  /** Optional extras the customer can tick, a single item or combo only. */
  addons?: ProductAddon[]
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
  /**
   * A one-time product's sizes, when it is sold in sizes. Each size is a tile
   * with its own price and old price, and the chosen size is the cart line.
   */
  sizes?: ProductSize[]
  /** Where a plain form post returns to, so the shopper stays put. */
  returnPath?: string
  whatsapp?: null | string
}

export const ProductPurchase: React.FC<ProductPurchaseProps> = ({
  addons = [],
  combo = false,
  compareAtPrice,
  durations,
  oneTimePrice,
  productSlug,
  productTitle,
  returnPath = '/products',
  sizes = [],
  whatsapp,
}) => {
  const [selected, setSelected] = useState(0)
  const [qty, setQty] = useState(1)
  const [ticked, setTicked] = useState<number[]>([])

  const duration = durations[selected] ?? durations[0]
  const isOneTime = typeof oneTimePrice === 'number' && oneTimePrice >= 1
  /* Sold in sizes: the chosen size sets the price, the old price and the
     line that goes into the cart. */
  const sized = isOneTime && sizes.length > 0
  const size = sized ? (sizes[selected] ?? sizes[0]) : null
  const shownPrice = size?.price ?? oneTimePrice ?? 0
  const shownCompare = sized ? (size?.compareAtPrice ?? null) : compareAtPrice
  const lineDuration = isOneTime
    ? (size?.label ?? ONE_TIME_DURATION)
    : (duration?.label ?? '')

  /* Extras ride single items and combos only. The total on the button is for
     show: the server prices the line again from the records. */
  const offeredAddons = isOneTime ? addons : []
  const chosenAddons = offeredAddons.filter((addon) => ticked.includes(addon.id))
  const extrasPerItem = chosenAddons.reduce((sum, addon) => sum + addon.price, 0)
  const toggleAddon = (id: number) =>
    setTicked((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]))

  // Hooks run before the early return below, so the hook order never changes.
  const { added, message, onSubmit, pending } = useAddToCart(
    { addons: chosenAddons.map((addon) => addon.id), duration: lineDuration, product: productSlug },
    { oneTime: isOneTime },
  )

  if (!isOneTime && !duration) return null

  const hasSaving = isOneTime && typeof shownCompare === 'number' && shownCompare > shownPrice

  return (
    <div>
      {/* The price, said once. */}
      <div aria-live="polite">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[32px] leading-none font-extrabold tracking-[-0.01em] text-green-900 tabular-nums">
            {formatPaise(isOneTime ? shownPrice : duration!.price)}
          </span>
          {hasSaving ? (
            <>
              <del className="text-ink-600 text-body tabular-nums">
                {formatPaise(shownCompare)}
              </del>
              <span className="rounded-pill bg-gold-100 px-2.5 py-1 text-xs font-bold text-green-900">
                {Math.floor(((shownCompare - shownPrice) / shownCompare) * 100)}% OFF
              </span>
            </>
          ) : null}
        </p>
        <p className="text-ink-600 mt-2 text-sm">
          {isOneTime
            ? combo
              ? 'One fixed price for the whole combo.'
              : 'Cooked fresh and delivered once.'
            : `${daysLabel(duration!.days)} of meals`}
        </p>
      </div>

      <form action="/api/cart/add" className="mt-6" method="post" onSubmit={onSubmit}>
        <input name="product" type="hidden" value={productSlug} />
        <input name="return" type="hidden" value={returnPath} />
        {isOneTime && !sized ? (
          <input name="duration" type="hidden" value={ONE_TIME_DURATION} />
        ) : null}

        {/* Sizes as tiles, each with its own price. Native radios. */}
        {sized ? (
          <OptionTiles
            className="mb-6"
            legend={
              <>
                Choose a size<span className="sr-only"> of {productTitle}</span>
              </>
            }
            onSelect={setSelected}
            options={sizes.map((option, index) => ({
              content: (
                <>
                  <span className="text-sm font-bold">{option.label}</span>
                  <TileDot />
                  <span className={TILE_PRICE}>{formatPaise(option.price)}</span>
                  {option.compareAtPrice !== null ? (
                    <del className={TILE_SUB}>{formatPaise(option.compareAtPrice)}</del>
                  ) : null}
                </>
              ),
              key: `${option.label}-${index}`,
              value: option.label,
            }))}
            selected={selected}
          />
        ) : null}

        {/* The options as tiles, like a shop's size choice. Native radios. */}
        {!isOneTime ? (
          <OptionTiles
            legend={
              <>
                Choose your plan<span className="sr-only"> for {productTitle}</span>
              </>
            }
            onSelect={setSelected}
            options={durations.map((option, index) => ({
              content: (
                <>
                  <span className={TILE_PRICE}>{formatPaise(option.price)}</span>
                  <TileDot />
                  <span className={TILE_SUB}>{daysLabel(option.days)}</span>
                </>
              ),
              key: `${option.label}-${index}`,
              value: option.label,
            }))}
            selected={selected}
          />
        ) : null}

        {/* Optional extras: native checkboxes, so they post without JavaScript. */}
        {offeredAddons.length > 0 ? (
          <fieldset className="mb-6">
            <legend className="text-ink-900 mb-3 text-sm font-bold">
              Add extras <span className="text-ink-600 font-normal">(optional)</span>
              <span className="sr-only"> to {productTitle}</span>
            </legend>
            <div className="grid gap-2">
              {offeredAddons.map((addon) => (
                <label
                  className="border-line has-[:checked]:border-green-700 has-[:checked]:bg-green-50 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-green-500 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-2.5 transition-colors motion-reduce:transition-none"
                  key={addon.id}
                >
                  <input
                    checked={ticked.includes(addon.id)}
                    className="size-5 shrink-0 accent-green-700 focus-visible:outline-none"
                    name="addon"
                    onChange={() => toggleAddon(addon.id)}
                    type="checkbox"
                    value={addon.id}
                  />
                  <span className="text-ink-900 min-w-0 flex-1 text-sm font-semibold">
                    {addon.title}
                    {addon.note ? <span className="text-ink-600 ml-2 text-xs font-normal">{addon.note}</span> : null}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-green-700 tabular-nums">
                    + {formatPaise(addon.price)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {/* Quantity, Add to cart and Buy now on one row. */}
        <div className={cn('flex flex-wrap items-center gap-3', !isOneTime && 'mt-6')}>
          {isOneTime ? <QuantityStepper productTitle={productTitle} qty={qty} setQty={setQty} /> : null}

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
            {pending
              ? CART_ADDING
              : added
                ? 'Added'
                : chosenAddons.length > 0
                  ? `${CART_ADD_CTA} · ${formatPaise((shownPrice + extrasPerItem) * qty)}`
                  : CART_ADD_CTA}
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
