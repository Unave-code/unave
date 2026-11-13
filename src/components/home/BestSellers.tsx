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
    <article className="group grid aspect-square grid-rows-[3fr_1fr] rounded-md border border-line bg-card shadow-sm transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
      <Link
        aria-label={`View ${product.title}`}
        className="focus-visible:outline-green-700 relative block overflow-hidden rounded-t-md focus-visible:outline-2 focus-visible:outline-offset-2"
        href={productHref(product.slug)}
      >
        <div className="bg-green-50 relative h-full">
          {image?.url ? (
            <Media
              alt={image.alt?.trim() || product.title}
              fill
              imgClassName="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
              resource={image}
              size="(min-width: 64rem) 20vw, (min-width: 40rem) 42vw, 82vw"
            />
          ) : (
            <Image
              alt=""
              aria-hidden="true"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
              fill
              sizes="(min-width: 64rem) 20vw, (min-width: 40rem) 42vw, 82vw"
              src={PRODUCT_PLACEHOLDER}
            />
          )}
          <div
            aria-hidden="true"
            className="from-green-900/95 via-green-900/60 absolute inset-0 bg-linear-to-t to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 p-3">
            <h3 className="text-body text-cream truncate font-semibold">{product.title}</h3>
            {price ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-body text-cream font-bold">{price}</p>
                {compareAtPrice !== null ? (
                  <del className="text-cream/80 text-sm">{formatPaise(compareAtPrice)}</del>
                ) : null}
                {discount >= 1 ? (
                  <span className="rounded-pill bg-gold-400 text-green-900 px-2 py-1 text-xs font-bold">
                    {discount}% OFF
                  </span>
                ) : null}
                {isOneTime && product.packSize ? (
                  <p className="text-cream ml-auto text-sm font-medium uppercase whitespace-nowrap">
                    {product.packSize}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="min-h-0 px-3 py-2">
        {canAdd ? (
          <BestSellerAddButton
            durationLabel={durationLabel}
            oneTime={isOneTime}
            productSlug={product.slug}
            productTitle={product.title}
          />
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
          aria-label="Featured products"
          className="mt-8 grid auto-cols-[min(82vw,22rem)] grid-flow-col snap-x snap-mandatory justify-center gap-4 overflow-x-auto overscroll-x-contain pb-4 focus-visible:outline-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 sm:auto-cols-[min(42vw,22rem)] lg:auto-cols-[min(22vw,20rem)]"
          tabIndex={0}
        >
          {products.map((product) => (
            <li className="h-full snap-start" key={product.id}>
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
