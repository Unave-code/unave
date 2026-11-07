import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { Media } from '@/components/Media'
import type { Product } from '@/payload-types'
import { formatPaise } from '@/utilities/money'
import { productHref } from '@/utilities/productsCategoryCopy'

import { AddToCartButton } from './AddToCartButton'
import { PRODUCT_PLACEHOLDER } from './productPlaceholder'

/**
 * One product on a shelf (spec 0007, AC-1): the photo, the name and the first
 * duration's price, then one Add to cart control for exactly that duration.
 *
 * Flat by design — a 1px line and no shadow, so a shelf of cards stays quiet —
 * and the open and the buy are two separate controls: the photo, name and price
 * are one link to the product's own page, where every duration can be chosen,
 * and the button below adds the shown line without opening anything. A paused
 * product renders the card with no button at all.
 *
 * The price comes straight from the product record, never from the browser, and
 * is formatted in the one place money is ever formatted. The photo falls back to
 * a branded placeholder so a card is never a blank box, and every photo shares
 * one 4:3 ratio so a shelf keeps its rhythm.
 */
export const ProductCard: React.FC<{
  product: Product
  /** Where a plain form post returns to, so the shelf the shopper came from stays put. */
  returnPath?: string
}> = ({ product, returnPath = '/products' }) => {
  const first = (product.durations ?? [])[0]
  const image = product.image && typeof product.image === 'object' ? product.image : null
  const imageAlt = image?.alt?.trim() || product.title

  return (
    <article className="border-line bg-card relative flex flex-col overflow-hidden rounded-lg border transition duration-200 hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none">
      <Link
        className="group focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        href={productHref(product.slug)}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-green-50">
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
        </div>

        <div className="p-5">
          <h3 className="text-base group-hover:text-green-700 transition-colors motion-reduce:transition-none">
            {product.title}
          </h3>

          {first ? (
            <p className="text-green-700 mt-1.5 text-base font-bold tracking-tight">
              {formatPaise(Number(first.price))}
              <span className="text-ink-600 ml-1.5 text-xs font-normal">{first.label}</span>
            </p>
          ) : null}
        </div>
      </Link>

      {product.available && first ? (
        <div className="px-5 pb-5">
          <AddToCartButton
            durationLabel={first.label}
            productSlug={product.slug}
            returnPath={returnPath}
          />
        </div>
      ) : null}
    </article>
  )
}
