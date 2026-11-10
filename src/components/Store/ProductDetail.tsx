import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { Check } from 'lucide-react'

import { Media } from '@/components/Media'
import { Notice } from '@/components/Notice'
import RichText from '@/components/RichText'
import { Section } from '@/components/home/Section'
import type { Product } from '@/payload-types'
import { formatPaise } from '@/utilities/money'
import { PRODUCT_BACK_LABEL, PRODUCT_PAUSED_INLINE, PRODUCT_POINTS_HEADING } from '@/utilities/productPageCopy'
import {
  PRODUCTS_PAUSED_NOTE_BODY,
  PRODUCTS_PAUSED_NOTE_TITLE,
  PRODUCTS_RELATED_HEADING,
} from '@/utilities/productsCopy'
import {
  AUDIENCE_LABEL,
  CATEGORY_LABEL,
  categoryBadgeAriaLabel,
  productCategoryHref,
  productHref,
} from '@/utilities/productsCategoryCopy'

import { ProductCard } from './ProductCard'
import { ProductPurchase, type ProductDuration } from './ProductPurchase'
import { PRODUCT_PLACEHOLDER } from './productPlaceholder'

/**
 * One chip on the photo's gradient band. The category chip is the only one
 * that is a link — it leads back to the shelf the product belongs to.
 */
const HERO_CHIP = 'rounded-pill inline-flex px-3 py-1 text-xs font-bold tracking-wide uppercase shadow-sm'

/**
 * One product's own page (design.md §6.15).
 *
 * The card is a door and this is the room, and the room keeps the card's
 * language in two columns: the photograph fills the left column at 4:3 with
 * the name riding a gradient band along its bottom edge, the badges — the
 * category chip (a link back to that shelf), the audience chip and, on a
 * paused product, a gold Paused chip — beside the subcategory eyebrow above
 * it, and the points reading under the photo in the same column. The right
 * column is the buy column: the bare buy panel — price, duration chips and
 * the Add to cart control divided by hairlines, no box around them — first,
 * the description under it, all pinned sticky while the left scrolls. On a
 * phone the buy column follows the photo before anything else.
 *
 * Below the two columns the kitchen's related products appear: the rest of
 * the same shelf as cards, each one opening its own page.
 *
 * A paused product still renders in full — the kitchen can pause a product
 * without hiding it — with its durations and prices readable and nothing to
 * add. Prices come straight from the product record and are formatted in the
 * one place money is ever formatted.
 */
export const ProductDetail: React.FC<{
  product: Product
  /** The rest of the same shelf, newest first, this product left out. */
  related?: Product[]
  whatsapp?: null | string
}> = ({ product, related, whatsapp }) => {
  const durations: ProductDuration[] = (product.durations ?? []).map((duration) => ({
    days: Number(duration.days),
    label: duration.label,
    price: Number(duration.price),
  }))

  const isOneTime = product.type === 'one-time'
  const oneTimePrice = Number(product.price)
  const buyableOneTime = isOneTime && oneTimePrice >= 1

  const points = (product.points ?? [])
    .map((entry) => entry.point?.trim() ?? '')
    .filter((point) => point.length > 0)

  const subcategory =
    product.subcategory && typeof product.subcategory === 'object'
      ? product.subcategory.title
      : null

  const image = product.image && typeof product.image === 'object' ? product.image : null
  const imageAlt = image?.alt?.trim() || product.title

  return (
    <main>
      <Section tone="white">
        <nav aria-label="Breadcrumb" className="text-caption text-ink-600 flex flex-wrap items-center gap-2">
          <Link className="hover:text-green-700 font-bold" href="/products">
            {PRODUCT_BACK_LABEL}
          </Link>

          {product.category ? (
            <>
              <span aria-hidden="true">/</span>
              <Link
                className="hover:text-green-700"
                href={productCategoryHref(product.category)}
              >
                {CATEGORY_LABEL[product.category]}
              </Link>
            </>
          ) : null}
        </nav>

        {/* Two columns: the photo and the reading flow on the left, the bare
            buy panel on the right, pinned there. The photo carries the card's
            gradient band with the name and the badges. The buy column sits
            second in the markup so on a phone it follows the photo before any
            reading, and the reading flows under the photo. */}
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-10">
          <div className="lg:col-span-7 lg:row-start-1">
            <div className="border-line bg-green-50 relative aspect-[4/3] w-full overflow-hidden rounded-lg border">
              {image?.url ? (
                <Media
                  alt={imageAlt}
                  fill
                  imgClassName="object-cover"
                  resource={image}
                  size="(max-width: 1024px) 100vw, 58vw"
                />
              ) : (
                <Image
                  alt=""
                  aria-hidden="true"
                  className="object-cover"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  src={PRODUCT_PLACEHOLDER}
                />
              )}

              <div className="from-green-900/95 via-green-900/50 absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t px-5 pt-20 pb-5 to-transparent sm:px-6 sm:pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  {product.category ? (
                    <Link
                      aria-label={categoryBadgeAriaLabel(product.category)}
                      className={`${HERO_CHIP} bg-green-100 text-green-800 transition-colors hover:bg-green-200 focus-visible:ring-green-500 focus-visible:outline-none motion-reduce:transition-none`}
                      href={productCategoryHref(product.category)}
                    >
                      {CATEGORY_LABEL[product.category]}
                    </Link>
                  ) : null}

                  {product.audience ? (
                    <span className={`${HERO_CHIP} bg-cream text-green-900`}>
                      {AUDIENCE_LABEL[product.audience]}
                    </span>
                  ) : null}

                  {!product.available ? (
                    <span className={`${HERO_CHIP} bg-gold-400 text-green-900`}>Paused</span>
                  ) : null}
                </div>

                {subcategory ? (
                  <p className="text-eyebrow text-gold-400 mt-3 uppercase">{subcategory}</p>
                ) : null}

                <h1 className={`text-h1 text-cream text-balance ${subcategory ? 'mt-2' : 'mt-3'}`}>
                  {product.title}
                </h1>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24 lg:self-start">
            {product.available && buyableOneTime ? (
              <ProductPurchase
                durations={[]}
                oneTimePrice={oneTimePrice}
                productSlug={product.slug}
                productTitle={product.title}
                returnPath={productHref(product.slug)}
                whatsapp={whatsapp}
              />
            ) : product.available && !isOneTime && durations.length > 0 ? (
              <ProductPurchase
                durations={durations}
                productSlug={product.slug}
                productTitle={product.title}
                returnPath={productHref(product.slug)}
                whatsapp={whatsapp}
              />
            ) : (
              <div>
                {buyableOneTime ? (
                  <p className="text-green-700 text-lg font-bold">{formatPaise(oneTimePrice)}</p>
                ) : (
                  <ul className="divide-line divide-y">
                    {durations.map((duration, index) => (
                      <li
                        className="flex items-center justify-between gap-4 py-3"
                        key={`${duration.label}-${index}`}
                      >
                        <div>
                          <p className="text-sm leading-tight font-bold">{duration.label}</p>
                          <p className="text-caption text-ink-600 mt-0.5">
                            {duration.days} {duration.days === 1 ? 'day' : 'days'} of meals
                          </p>
                        </div>

                        <p className="text-green-700 text-sm font-bold">
                          {formatPaise(duration.price)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="text-ink-600 text-caption mt-3 leading-6">{PRODUCT_PAUSED_INLINE}</p>
              </div>
            )}

            {product.description ? (
              <RichText className="text-body text-ink-600 mt-8 max-w-[52ch]" data={product.description} enableGutter={false} />
            ) : null}
          </div>

          {points.length > 0 ? (
            <div className="lg:col-span-7 lg:row-start-2">
              <h2 className="text-h3">{PRODUCT_POINTS_HEADING}</h2>

              <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {points.map((point, index) => (
                  <li className="flex items-start gap-3" key={`${point}-${index}`}>
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"
                    >
                      <Check className="size-3" strokeWidth={2.5} />
                    </span>
                    <span className="text-ink-600 text-sm leading-6">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {related && related.length > 0 ? (
          <div className="mt-16">
            <h2 className="text-h3">{PRODUCTS_RELATED_HEADING}</h2>

            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <li key={item.id}>
                  <ProductCard product={item} returnPath={productHref(product.slug)} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!product.available ? (
          <Notice className="mt-10 max-w-[70ch]" title={PRODUCTS_PAUSED_NOTE_TITLE}>
            {PRODUCTS_PAUSED_NOTE_BODY}
          </Notice>
        ) : null}
      </Section>
    </main>
  )
}
