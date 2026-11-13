import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { Media } from '@/components/Media'
import type { Product } from '@/payload-types'
import { ONE_TIME_DURATION } from '@/utilities/cart'
import { leadPricePaise } from '@/utilities/leadPrice'
import { formatPaise } from '@/utilities/money'
import { isProductSellable } from '@/utilities/combos'
import { PRODUCTS_CARD_A_DAY, PRODUCTS_CARD_FROM } from '@/utilities/productsCopy'
import { AUDIENCE_LABEL, productHref } from '@/utilities/productsCategoryCopy'

import { AddToCartButton } from './AddToCartButton'
import { PRODUCT_PLACEHOLDER } from './productPlaceholder'

const PHOTO_PILL =
  'rounded-pill inline-flex items-center px-3 py-1 text-xs font-bold tracking-wide uppercase shadow-sm ring-1 backdrop-blur-sm'

/**
 * One product on a shelf (design.md §6.15).
 *
 * Photo-first and almost chromeless: the photo fills the whole card, the name
 * and the cheapest per-day rate sit on a gradient band along its bottom edge,
 * and the audience — or a pause — rides as a pill on the photo. The card is
 * one stretched link, so every pixel of photo and band opens the product's own
 * page, where the durations and totals live. The band is a pass-through
 * surface: its text lets clicks fall through to the link beneath, and only the
 * buy control opts out of that.
 *
 * That buy control is one gold pill adding the kitchen's default duration — the
 * first one on the record, or the reserved one-time line for a one-time
 * purchase, whose lead is the flat price instead of a per-day rate — revealed
 * on hover or focus on a fine pointer
 * (`.card-reveal`) and simply visible on touch, so a resting shelf stays quiet
 * without ever hiding the way to buy. A paused product renders with no control
 * and a gold Paused pill; its lead price stays readable.
 *
 * Prices come straight from the product record, never from the browser, and are
 * formatted in the one place money is ever formatted. The photo falls back to a
 * branded placeholder so a card is never a blank box, and every photo shares
 * one 4:3 ratio so a shelf keeps its rhythm.
 */
export const ProductCard: React.FC<{
  product: Product
  /** Where a plain form post returns to, so the shelf the shopper came from stays put. */
  returnPath?: string
}> = ({ product, returnPath = '/products' }) => {
  const durations = (product.durations ?? []).map((duration) => ({
    days: Number(duration.days),
    label: duration.label,
    price: Number(duration.price),
  }))
  const first = durations[0]

  // A one-time purchase sells one item at one price: its lead is the flat
  // price, not a per-day rate, and its cart line carries the reserved duration.
  const isOneTime = product.type === 'one-time'
  const isCombo = product.type === 'combo'
  const isFlatPrice = isOneTime || isCombo
  const isAvailable = isProductSellable(product)
  const oneTimePrice = Number(product.price)

  /* The lead price is the cheapest per-day rate across the durations, floored
     to whole rupees: "From ₹59 a day" leads a shopper to the running cost
     without promising more precision than it carries, and the exact totals sit
     on the product's own page. The stored `fromPrice` is that same number,
     worked out once on save, and it is what the shelf sorts and filters on; the
     fallback keeps a card honest if a row somehow carries no stored value. */
  const storedLead =
    typeof product.fromPrice === 'number' && product.fromPrice > 0 ? product.fromPrice : null
  const perDay = isFlatPrice ? null : (storedLead ?? leadPricePaise(product))
  const planPriceLine = perDay !== null ? `${PRODUCTS_CARD_FROM} ${formatPaise(perDay)} ${PRODUCTS_CARD_A_DAY}` : undefined
  const priceLine = isFlatPrice
    ? (oneTimePrice >= 1 ? formatPaise(oneTimePrice) : undefined)
    : planPriceLine

  const image = product.image && typeof product.image === 'object' ? product.image : null
  const imageAlt = image?.alt?.trim() || product.title

  return (
    <article className="group bg-green-50 relative isolate aspect-[4/3] overflow-hidden rounded-lg has-[:focus-visible]:ring-green-500 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-[3px]">
      {image?.url ? (
        <Media
          alt={imageAlt}
          fill
          imgClassName="object-cover transition duration-300 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          resource={image}
          size="(max-width: 768px) 100vw, 33vw"
        />
      ) : (
        <Image
          alt=""
          aria-hidden="true"
          className="object-cover transition duration-300 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          src={PRODUCT_PLACEHOLDER}
        />
      )}

      {product.audience || !isAvailable ? (
        <div className="pointer-events-none absolute top-3 left-3 z-20 flex flex-wrap gap-2">
          {product.audience ? (
            <span className={`${PHOTO_PILL} bg-green-900/70 text-cream ring-cream/25`}>
              {AUDIENCE_LABEL[product.audience]}
            </span>
          ) : null}

          {!isAvailable ? (
            <span className={`${PHOTO_PILL} bg-gold-400 text-green-900 ring-gold-300/70`}>Paused</span>
          ) : null}
        </div>
      ) : null}

      {/* The gradient band carries the name and the lead price. It lets clicks
          fall through to the stretched link below, so even the words open the
          product's own page. */}
      <div className="from-green-900/95 via-green-900/50 pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t px-4 pt-16 pb-4 to-transparent sm:px-5 sm:pb-5">
        <h3 className="text-h3 text-cream text-balance">{product.title}</h3>

        {isAvailable && isFlatPrice ? (
          <AddToCartButton
            durationLabel={ONE_TIME_DURATION}
            oneTime
            priceLine={priceLine}
            productSlug={product.slug}
            returnPath={returnPath}
          />
        ) : isAvailable && first ? (
          <AddToCartButton
            durationLabel={first.label}
            priceLine={priceLine}
            productSlug={product.slug}
            returnPath={returnPath}
          />
        ) : priceLine ? (
          <p className="text-cream/90 mt-1.5 min-h-5 text-sm font-bold tracking-tight">
            {priceLine}
          </p>
        ) : null}
      </div>

      {/* The door: one link stretched over the whole photo, named by the title
          it leads to. It sits beneath the band and the pills in paint order,
          so their words stay readable and their clicks stay its own. */}
      <Link
        className="focus-visible:outline-none absolute inset-0 z-0"
        href={productHref(product.slug)}
      >
        <span className="sr-only">{product.title}</span>
      </Link>
    </article>
  )
}
