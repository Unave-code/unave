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
    <article className="group flex flex-col">
      <Link
        aria-label={`View ${product.title}`}
        className="focus-visible:outline-green-700 block overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2"
        href={productHref(product.slug)}
      >
        <div className="bg-green-50 relative aspect-[3/2] overflow-hidden">
          {image?.url ? (
            <Media
              alt={image.alt?.trim() || product.title}
              fill
              imgClassName="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
              resource={image}
              size="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            />
          ) : (
            <Image
              alt=""
              aria-hidden="true"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
              fill
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
              src={PRODUCT_PLACEHOLDER}
            />
          )}
        </div>
      </Link>

      <div className="mt-3 flex flex-1 flex-col">
        <Link
          className="focus-visible:outline-green-700 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          href={productHref(product.slug)}
        >
          <h3 className="text-body text-ink-900 truncate font-semibold">{product.title}</h3>
        </Link>

        {price ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-body text-green-700 font-bold">{price}</p>
            {compareAtPrice !== null ? (
              <del className="text-ink-600 text-sm">{formatPaise(compareAtPrice)}</del>
            ) : null}
            {discount >= 1 ? (
              <span className="rounded-pill bg-green-700 text-white px-2 py-1 text-xs font-bold">
                {discount}% OFF
              </span>
            ) : null}
            {isOneTime && product.packSize ? (
              <p className="text-ink-900 ml-auto text-sm font-medium uppercase whitespace-nowrap">
                {product.packSize}
              </p>
            ) : null}
          </div>
        ) : null}

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
    <Section className="pt-0 md:pt-0" id="best-sellers">
      <h2 className="text-h2">{BEST_SELLERS_HEADING}</h2>
      <p className="text-body text-ink-600 mt-4 max-w-[65ch]">{BEST_SELLERS_INTRO}</p>

      {products.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((product) => (
            <BestSellerCard key={product.id} product={product} />
          ))}
        </div>
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
