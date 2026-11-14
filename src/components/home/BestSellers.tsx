import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { Cta } from '@/components/Cta'
import { Media } from '@/components/Media'
import { BestSellerAddButton } from '@/components/home/BestSellerAddButton'
import { PRODUCT_PLACEHOLDER } from '@/components/Store/productPlaceholder'
import type { Product } from '@/payload-types'
import { ONE_TIME_DURATION } from '@/utilities/cart'
import { leadPricePaise } from '@/utilities/leadPrice'
import { BEST_SELLERS_EMPTY, BEST_SELLERS_HEADING, BEST_SELLERS_INTRO } from '@/utilities/homeCopy'
import { formatPaise } from '@/utilities/money'
import { PRODUCTS_CARD_A_DAY, PRODUCTS_CARD_FROM } from '@/utilities/productsCopy'
import { productHref } from '@/utilities/productsCategoryCopy'
import { getFeaturedHomeProducts } from '@/utilities/products'

import { Section } from './Section'

const BestSellerCard: React.FC<{ product: Product }> = ({ product }) => {
  const image = product.image && typeof product.image === 'object' ? product.image : null
  const isOneTime = product.type === 'one-time'
  const oneTimePrice =
    isOneTime && typeof product.price === 'number' && Number.isFinite(product.price)
      ? product.price
      : null
  const storedLead =
    typeof product.fromPrice === 'number' && product.fromPrice > 0 ? product.fromPrice : null
  const perDay = isOneTime ? null : (storedLead ?? leadPricePaise(product))
  const price =
    oneTimePrice !== null && oneTimePrice >= 1
      ? formatPaise(oneTimePrice)
      : perDay !== null
        ? `${PRODUCTS_CARD_FROM} ${formatPaise(perDay)} ${PRODUCTS_CARD_A_DAY}`
        : undefined
  const compareAtPrice =
    isOneTime &&
    oneTimePrice !== null &&
    typeof product.compareAtPrice === 'number' &&
    product.compareAtPrice > oneTimePrice
      ? product.compareAtPrice
      : null
  const discount =
    compareAtPrice !== null && oneTimePrice !== null
      ? Math.floor(((compareAtPrice - oneTimePrice) / compareAtPrice) * 100)
      : 0
  const durationLabel = isOneTime ? ONE_TIME_DURATION : product.durations?.[0]?.label
  const canAdd = product.available && price && durationLabel

  return (
    <article className="group bg-card overflow-hidden rounded-lg p-2 shadow-sm transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
      <Link
        aria-label={`View ${product.title}`}
        className="focus-visible:outline-green-700 bg-green-50 relative block aspect-square overflow-hidden rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
        href={productHref(product.slug)}
      >
        {image?.url ? (
          <Media
            alt={image.alt?.trim() || product.title}
            fill
            imgClassName="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
            resource={image}
            size="(min-width: 64rem) 20vw, (min-width: 48rem) 30vw, 45vw"
          />
        ) : (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
            fill
            sizes="(min-width: 64rem) 20vw, (min-width: 48rem) 30vw, 45vw"
            src={PRODUCT_PLACEHOLDER}
          />
        )}
      </Link>

      <div className="flex flex-col px-2 pt-3 pb-0">
        <h3 className="text-body text-ink-900 line-clamp-2 font-semibold leading-snug">
          {product.title}
        </h3>

        {isOneTime && product.packSize ? (
          <span className="rounded-pill bg-green-50 text-green-800 mt-2 inline-flex self-start px-2.5 py-1 text-xs font-medium">
            {product.packSize}
          </span>
        ) : null}

        {price ? (
          <div className="mt-1">
            <p className="text-body text-gold-600 font-bold">{price}</p>
            {compareAtPrice !== null ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <del className="text-ink-600 text-xs">{formatPaise(compareAtPrice)}</del>
                {discount >= 1 ? (
                  <span className="rounded-pill bg-gold-100 text-green-900 px-2.5 py-1 text-xs font-bold">
                    {discount}% OFF
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {canAdd ? (
          <div className="mt-3">
            <BestSellerAddButton
              durationLabel={durationLabel}
              oneTime={isOneTime}
              productSlug={product.slug}
              productTitle={product.title}
            />
          </div>
        ) : null}
      </div>
    </article>
  )
}

export const BestSellers: React.FC = async () => {
  const products = await getFeaturedHomeProducts()()

  return (
    <Section id="best-sellers" tone="tint">
      <h2 className="text-h2">{BEST_SELLERS_HEADING}</h2>
      <p className="text-body text-ink-600 mt-4 max-w-[65ch]">{BEST_SELLERS_INTRO}</p>

      {products.length > 0 ? (
        <ul
          aria-label="Best sellers"
          className="mt-8 grid grid-cols-2 items-start gap-4 md:grid-cols-3 lg:grid-cols-5"
        >
          {products.map((product) => (
            <li key={product.id}>
              <BestSellerCard product={product} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="border-line bg-card mt-10 max-w-[52ch] rounded-2xl border p-8">
          <p className="text-body text-ink-600">{BEST_SELLERS_EMPTY}</p>
          <div className="mt-6">
            <Cta href="/products" variant="secondary">
              See every product
            </Cta>
          </div>
        </div>
      )}
    </Section>
  )
}
