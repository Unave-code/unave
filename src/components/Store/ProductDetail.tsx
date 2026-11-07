import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { Media } from '@/components/Media'
import { Notice } from '@/components/Notice'
import RichText from '@/components/RichText'
import { Section } from '@/components/home/Section'
import type { Product } from '@/payload-types'
import { formatPaise } from '@/utilities/money'
import { PRODUCT_BACK_LABEL, PRODUCT_PAUSED_INLINE, PRODUCT_POINTS_HEADING } from '@/utilities/productPageCopy'
import {
  AUDIENCE_LABEL,
  CATEGORY_LABEL,
  categoryBadgeAriaLabel,
  productCategoryHref,
  productHref,
} from '@/utilities/productsCategoryCopy'
import { PRODUCTS_PAUSED_NOTE_BODY, PRODUCTS_PAUSED_NOTE_TITLE } from '@/utilities/productsCopy'

import { ProductPurchase, type ProductDuration } from './ProductPurchase'
import { PRODUCT_PLACEHOLDER } from './productPlaceholder'

const BADGE =
  'rounded-pill inline-flex px-3 py-1 text-xs font-bold tracking-wide uppercase shadow-sm'

/**
 * One product's own page (design.md §6.15).
 *
 * The card is a door and this is the room: the same photo at full width, the
 * name, the category and audience badges and the length of the product, then the
 * price panel where the durations lead into the cart. The description and the
 * product's points follow underneath.
 *
 * A paused product still renders in full — the kitchen can pause a product
 * without hiding it — with its durations and prices readable, a gold label and
 * nothing to add. Prices come straight from the product record and are formatted
 * in the one place money is ever formatted.
 */
export const ProductDetail: React.FC<{ product: Product; whatsapp?: null | string }> = ({
  product,
  whatsapp,
}) => {
  const durations: ProductDuration[] = (product.durations ?? []).map((duration) => ({
    days: Number(duration.days),
    label: duration.label,
    price: Number(duration.price),
  }))

  const points = (product.points ?? [])
    .map((entry) => entry.point?.trim() ?? '')
    .filter((point) => point.length > 0)

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

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-line bg-green-50">
            {image?.url ? (
              <Media
                alt={imageAlt}
                fill
                imgClassName="object-cover"
                resource={image}
                size="(max-width: 1024px) 100vw, 50vw"
              />
            ) : (
              <Image
                alt=""
                aria-hidden="true"
                className="object-cover"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                src={PRODUCT_PLACEHOLDER}
              />
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              {product.category ? (
                <Link
                  aria-label={categoryBadgeAriaLabel(product.category)}
                  className={`${BADGE} bg-green-100 text-green-700 transition-colors hover:bg-green-200 focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none`}
                  href={productCategoryHref(product.category)}
                >
                  {CATEGORY_LABEL[product.category]}
                </Link>
              ) : null}

              {product.audience ? (
                <span className={`${BADGE} bg-gold-100 text-gold-600`}>
                  {AUDIENCE_LABEL[product.audience]}
                </span>
              ) : null}

              {!product.available ? (
                <span className={`${BADGE} bg-gold-400 text-green-900`}>Paused</span>
              ) : null}
            </div>

            <h1 className="text-h1 mt-5 text-balance">{product.title}</h1>

            <div className="mt-8">
              {product.available && durations.length > 0 ? (
                <ProductPurchase
                  durations={durations}
                  productSlug={product.slug}
                  productTitle={product.title}
                  returnPath={productHref(product.slug)}
                  whatsapp={whatsapp}
                />
              ) : (
                <div className="bg-green-50 rounded-md p-4">
                  <ul className="divide-line flex flex-col divide-y">
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

                  <p className="text-ink-600 text-caption mt-3 leading-6">{PRODUCT_PAUSED_INLINE}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {product.description || points.length > 0 ? (
          <div className="border-line mt-14 max-w-[62ch] border-t pt-10">
            {product.description ? (
              <RichText className="text-ink-600 text-body leading-7" data={product.description} enableGutter={false} />
            ) : null}

            {points.length > 0 ? (
              <>
                <h2 className="text-h3 mt-8">{PRODUCT_POINTS_HEADING}</h2>

                <ul className="mt-4 flex flex-col gap-2">
                  {points.map((point, index) => (
                    <li
                      className="text-ink-600 flex items-start gap-2 text-sm leading-6"
                      key={`${point}-${index}`}
                    >
                      <span aria-hidden="true" className="text-green-700 mt-1">
                        •
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
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
