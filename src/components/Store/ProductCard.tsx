import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { Media } from '@/components/Media'
import type { Product } from '@/payload-types'
import { ONE_TIME_DURATION } from '@/utilities/cart'
import { isProductSellable } from '@/utilities/combos'
import { leadPricePaise } from '@/utilities/leadPrice'
import { formatPaise } from '@/utilities/money'
import { AUDIENCE_LABEL, productHref } from '@/utilities/productsCategoryCopy'
import { PRODUCTS_CARD_A_DAY, PRODUCTS_CARD_FROM } from '@/utilities/productsCopy'

import { ProductCardActions } from './ProductCardActions'
import { PRODUCT_PLACEHOLDER } from './productPlaceholder'

const PHOTO_PILL =
  'rounded-pill inline-flex items-center px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase shadow-sm'

/**
 * One product, anywhere the site lists products (design.md §6.15): the home
 * page's best sellers, every shelf, and the related row under a product page.
 *
 * A white card with a square photo on a soft green frame, the name, the price
 * it leads with, and the two buy controls pinned to the foot so a row of cards
 * keeps its buttons on one line. The price is the flat price for a one-time
 * product or a combo, or the cheapest per-day rate for a meal plan; a one-time
 * product on offer also shows the old price struck through and the saving.
 * The audience, a combo's item count and a pause ride as small pills on the
 * photo. A paused product keeps its price readable and has nothing to add.
 *
 * The photo and the name both open the product's own page; only the name is a
 * tab stop, so a keyboard visits each card once before its buttons.
 */
export const ProductCard: React.FC<{
  product: Product
  /** Where a plain (no JavaScript) add to cart returns to. */
  returnPath?: string
  /** The `sizes` hint for the photo; the default suits a five-up row. */
  sizes?: string
}> = ({
  product,
  returnPath = '/products',
  sizes = '(min-width: 64rem) 20vw, (min-width: 48rem) 30vw, 45vw',
}) => {
  const image = product.image && typeof product.image === 'object' ? product.image : null
  const href = productHref(product.slug)
  const isOneTime = product.type === 'one-time'
  const isCombo = product.type === 'combo'
  const isAvailable = isProductSellable(product)

  /* A one-time product and a combo both sell at one flat price, added through
     the reserved one-time line; only a meal plan leads with a rate a day. */
  const isFlatPrice = isOneTime || isCombo
  const flatPrice =
    isFlatPrice && typeof product.price === 'number' && Number.isFinite(product.price)
      ? product.price
      : null
  const storedLead =
    typeof product.fromPrice === 'number' && product.fromPrice > 0 ? product.fromPrice : null
  const perDay = isFlatPrice ? null : (storedLead ?? leadPricePaise(product))
  const price =
    flatPrice !== null && flatPrice >= 1
      ? formatPaise(flatPrice)
      : perDay !== null
        ? `${PRODUCTS_CARD_FROM} ${formatPaise(perDay)} ${PRODUCTS_CARD_A_DAY}`
        : undefined
  const compareAtPrice =
    isOneTime &&
    flatPrice !== null &&
    typeof product.compareAtPrice === 'number' &&
    product.compareAtPrice > flatPrice
      ? product.compareAtPrice
      : null
  const discount =
    compareAtPrice !== null && flatPrice !== null
      ? Math.floor(((compareAtPrice - flatPrice) / compareAtPrice) * 100)
      : 0
  const durationLabel = isFlatPrice ? ONE_TIME_DURATION : product.durations?.[0]?.label
  const canAdd = isAvailable && price && durationLabel

  const hasPills = Boolean(product.audience) || isCombo || !isAvailable

  return (
    <article className="group bg-card flex h-full flex-col overflow-hidden rounded-lg p-2 shadow-sm transition-[box-shadow,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link
        aria-hidden="true"
        className="relative block aspect-square overflow-hidden rounded-md bg-green-50"
        href={href}
        tabIndex={-1}
      >
        {image?.url ? (
          <Media
            alt=""
            fill
            imgClassName="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
            resource={image}
            size={sizes}
          />
        ) : (
          <Image
            alt=""
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
            data-testid="product-image-placeholder"
            fill
            sizes={sizes}
            src={PRODUCT_PLACEHOLDER}
          />
        )}

        {hasPills ? (
          <span className="absolute top-2 left-2 flex flex-wrap gap-1.5">
            {!isAvailable ? (
              <span className={`${PHOTO_PILL} bg-gold-400 text-green-900`}>Paused</span>
            ) : null}
            {isCombo ? (
              <span className={`${PHOTO_PILL} bg-gold-100 text-green-900`}>
                Combo · {product.components?.length ?? 0} items
              </span>
            ) : null}
            {product.audience ? (
              <span className={`${PHOTO_PILL} text-cream bg-green-900/75 backdrop-blur-sm`}>
                {AUDIENCE_LABEL[product.audience]}
              </span>
            ) : null}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col px-2 pt-3 pb-1">
        <h3 className="text-body text-ink-900 line-clamp-2 leading-snug font-semibold">
          <Link
            className="rounded-sm underline-offset-4 hover:text-green-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
            href={href}
          >
            {product.title}
          </Link>
        </h3>

        {isOneTime && product.packSize ? (
          <span className="rounded-pill mt-2 inline-flex self-start bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800">
            {product.packSize}
          </span>
        ) : null}

        {price ? (
          <div className="mt-1">
            <p className="text-body font-bold text-green-700 tabular-nums">{price}</p>
            {compareAtPrice !== null ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <del className="text-ink-600 text-xs tabular-nums">
                  {formatPaise(compareAtPrice)}
                </del>
                {discount >= 1 ? (
                  <span className="rounded-pill bg-gold-100 px-2.5 py-1 text-xs font-bold text-green-900">
                    {discount}% OFF
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {canAdd ? (
          <div className="mt-auto pt-3">
            <ProductCardActions
              durationLabel={durationLabel}
              oneTime={isFlatPrice}
              productSlug={product.slug}
              productTitle={product.title}
              returnPath={returnPath}
            />
          </div>
        ) : null}
      </div>
    </article>
  )
}
