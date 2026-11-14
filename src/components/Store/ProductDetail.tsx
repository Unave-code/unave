import Link from 'next/link'
import React from 'react'
import { ArrowUpRight, Check } from 'lucide-react'
import Image from 'next/image'

import { Notice } from '@/components/Notice'
import RichText from '@/components/RichText'
import { Section } from '@/components/home/Section'
import type { Media as MediaDoc, Product } from '@/payload-types'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { formatPaise } from '@/utilities/money'
import { comboSeparatePrice, isProductSellable, selectedComboDuration } from '@/utilities/combos'
import {
  PRODUCT_BACK_LABEL,
  PRODUCT_PAUSED_INLINE,
  PRODUCT_POINTS_HEADING,
} from '@/utilities/productPageCopy'
import {
  PRODUCT_ONE_TIME_LABEL,
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
import { cn } from '@/utilities/ui'

import { ProductCard } from './ProductCard'
import { ProductGallery, type GalleryImage } from './ProductGallery'
import { ProductPurchase, type ProductDuration } from './ProductPurchase'
import { PRODUCT_PLACEHOLDER } from './productPlaceholder'

const CHIP =
  'rounded-pill inline-flex min-h-7 items-center px-3 text-xs font-bold tracking-wide uppercase'

const KIND_LABEL: Record<Product['type'], string> = {
  combo: 'Meal combo',
  'one-time': PRODUCT_ONE_TIME_LABEL,
  plan: 'Meal plan',
}

type ComboItem = {
  days?: null | number
  durationLabel?: null | string
  image: MediaDoc | null
  slug: null | string
  title: string
  type: null | Product['type']
}

const mediaOf = (value: Product['image']): MediaDoc | null =>
  value && typeof value === 'object' && value.url ? value : null

const srcOf = (media: MediaDoc): string => getMediaUrl(media.url, media.updatedAt)

const daysText = (days?: null | number) => (days ? `${days} ${days === 1 ? 'day' : 'days'}` : '')

/** A section heading inside the page's columns. */
const ColumnHeading: React.FC<{ children: React.ReactNode; id: string }> = ({ children, id }) => (
  <h2 className="text-body text-green-900 font-bold" id={id}>
    {children}
  </h2>
)

/**
 * One product's own page (design.md §6.15), laid out as a shop page.
 *
 * Two columns from `md`: the photo gallery on the left (seven of twelve
 * columns from `lg`), pinned while the page scrolls, and beside it everything
 * needed to choose and buy, in reading order — the chips, the name, its kind
 * and whether it can be ordered, a combo's saving, then the buy panel (the
 * price shown once, the durations as comparable rows, add to cart), then what
 * you get and, on a combo, what is inside it with a photo of each. On a phone
 * it all stacks, gallery first.
 *
 * Below the columns, full width: the description and a details table built
 * only from the record's own fields, then the rest of the same shelf on its own
 * tint band. Nothing here is invented — no ratings, no delivery promises.
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
  const isCombo = product.type === 'combo'
  const isAvailable = isProductSellable(product)
  const oneTimePrice = Number(product.price)
  const buyableOneTime = (isOneTime || isCombo) && oneTimePrice >= 1

  const comboItems: ComboItem[] = (product.components ?? []).map((component) => {
    const source =
      component.product && typeof component.product === 'object' ? component.product : null
    const duration =
      source?.type === 'plan' ? selectedComboDuration(source, component.durationLabel) : null

    return {
      days: duration?.days ?? component.durationDaysSnapshot,
      durationLabel: duration?.label ?? component.durationLabel,
      image: source ? mediaOf(source.image) : null,
      slug: source?.slug ?? null,
      title: source?.title ?? component.productTitleSnapshot ?? 'Product unavailable',
      type: source?.type ?? null,
    }
  })

  const points = (product.points ?? [])
    .map((entry) => entry.point?.trim() ?? '')
    .filter((point) => point.length > 0)

  const subcategory =
    product.subcategory && typeof product.subcategory === 'object'
      ? product.subcategory.title
      : null

  /* The gallery: the product's own photo first, then on a combo a photo of
     each item that has one, captioned with the item's name. */
  const ownImage = mediaOf(product.image)
  const gallery: GalleryImage[] = [
    ...(ownImage
      ? [
          {
            alt: ownImage.alt?.trim() || product.title,
            caption: product.title,
            src: srcOf(ownImage),
          },
        ]
      : []),
    ...comboItems.flatMap((item) =>
      item.image
        ? [
            {
              alt: item.image.alt?.trim() || item.title,
              caption: item.title,
              src: srcOf(item.image),
            },
          ]
        : [],
    ),
  ]

  const compareAt =
    buyableOneTime &&
    typeof product.compareAtPrice === 'number' &&
    product.compareAtPrice > oneTimePrice
      ? product.compareAtPrice
      : null

  /* A combo's value: what its items cost bought one by one. Shown only when
     the combo really is cheaper, worked out from the live item prices. */
  const separate = isCombo ? comboSeparatePrice(product) : null
  const comboSaving = separate !== null && oneTimePrice >= 1 ? separate - oneTimePrice : 0

  const details: [string, string][] = [
    ['Kind', KIND_LABEL[product.type]],
    ...(product.category
      ? [['Category', CATEGORY_LABEL[product.category]] as [string, string]]
      : []),
    ...(subcategory ? [['Type', subcategory] as [string, string]] : []),
    ...(product.audience ? [['For', AUDIENCE_LABEL[product.audience]] as [string, string]] : []),
    ...(product.packSize ? [['Pack size', product.packSize] as [string, string]] : []),
    ...(isCombo && comboItems.length > 0
      ? [['Items', `${comboItems.length} in one combo`] as [string, string]]
      : []),
  ]

  const hasReading = Boolean(product.description) || isCombo || !isAvailable

  return (
    <main>
      <Section className="pt-6 md:pt-10" tone="white">
        <nav aria-label="Breadcrumb">
          <ol className="text-caption text-ink-600 flex flex-wrap items-center gap-2">
            <li>
              <Link
                className="hover:text-green-700 font-bold underline-offset-4 hover:underline"
                href="/products"
              >
                {PRODUCT_BACK_LABEL}
              </Link>
            </li>
            {product.category ? (
              <>
                <li aria-hidden="true">›</li>
                <li>
                  <Link
                    className="hover:text-green-700 underline-offset-4 hover:underline"
                    href={productCategoryHref(product.category)}
                  >
                    {CATEGORY_LABEL[product.category]}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden="true">›</li>
            <li aria-current="page" className="text-ink-900 max-w-[28ch] truncate">
              {product.title}
            </li>
          </ol>
        </nav>

        <div className="mt-6 grid items-start gap-8 md:grid-cols-2 lg:grid-cols-12 lg:gap-12">
          {/* The photos, pinned while the column beside them scrolls. */}
          <div className="min-w-0 md:sticky md:top-28 lg:col-span-7">
            <ProductGallery images={gallery} paused={!isAvailable} />
          </div>

          {/* Everything needed to choose and buy, in reading order: what it
              is, whether it can be ordered, the price and the choice, then
              what you get and, on a combo, what is inside. */}
          <div className="min-w-0 lg:col-span-5">
            <div className="flex flex-wrap items-center gap-2">
              {product.category ? (
                <Link
                  aria-label={categoryBadgeAriaLabel(product.category)}
                  data-hit-area="44"
                  className={cn(
                    CHIP,
                    'relative bg-green-100 text-green-800 transition-colors hover:bg-green-200 focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none motion-reduce:transition-none after:absolute after:-inset-y-2 after:inset-x-0',
                  )}
                  href={productCategoryHref(product.category)}
                >
                  {CATEGORY_LABEL[product.category]}
                </Link>
              ) : null}
              {product.audience ? (
                <span className={cn(CHIP, 'ring-line text-ink-600 ring-1 ring-inset')}>
                  {AUDIENCE_LABEL[product.audience]}
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 text-[28px] leading-[1.15] font-extrabold tracking-[-0.01em] text-balance text-green-900 capitalize md:text-[36px]">
              {product.title}
            </h1>

            <p className="text-caption text-ink-600 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                {KIND_LABEL[product.type]}
                {subcategory ? (
                  <>
                    {' · '}
                    <span className="wrap-anywhere">{subcategory}</span>
                  </>
                ) : null}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 font-bold',
                  isAvailable ? 'text-green-700' : 'text-warning',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn('size-2 rounded-full', isAvailable ? 'bg-success' : 'bg-gold-500')}
                />
                {isAvailable ? 'Available to order' : 'Paused for now'}
              </span>
            </p>

            {comboSaving >= 100 && separate !== null ? (
              <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-ink-600">
                  Bought separately <del className="tabular-nums">{formatPaise(separate)}</del>
                </span>
                <span className="rounded-pill bg-[var(--success-surface)] text-success px-2.5 py-1 text-xs font-bold tabular-nums">
                  You save {formatPaise(comboSaving)}
                </span>
              </p>
            ) : null}

            <section aria-label="Buy" className="border-line mt-6 border-t pt-6">
              {isAvailable && buyableOneTime ? (
                <ProductPurchase
                  combo={isCombo}
                  compareAtPrice={compareAt}
                  durations={[]}
                  oneTimePrice={oneTimePrice}
                  productSlug={product.slug}
                  productTitle={product.title}
                  returnPath={productHref(product.slug)}
                  whatsapp={whatsapp}
                />
              ) : isAvailable && !isOneTime && !isCombo && durations.length > 0 ? (
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
                    <p className="text-[30px] leading-none font-extrabold text-green-900 tabular-nums">
                      {formatPaise(oneTimePrice)}
                    </p>
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
                              {daysText(duration.days)} of meals
                            </p>
                          </div>
                          <p className="text-green-700 text-sm font-bold tabular-nums">
                            {formatPaise(duration.price)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-ink-600 text-caption mt-3 leading-6">
                    {PRODUCT_PAUSED_INLINE}
                  </p>
                </div>
              )}
            </section>

            {points.length > 0 ? (
              <section
                aria-labelledby="product-points-heading"
                className="border-line mt-5 border-t pt-5"
              >
                <ColumnHeading id="product-points-heading">{PRODUCT_POINTS_HEADING}</ColumnHeading>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {points.map((point, index) => (
                    <li className="flex items-start gap-3" key={`${point}-${index}`}>
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"
                      >
                        <Check className="size-3" strokeWidth={2.5} />
                      </span>
                      <span className="text-ink-900 text-sm leading-6">{point}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {isCombo && comboItems.length > 0 ? (
              <section
                aria-labelledby="combo-contents-heading"
                className="border-line mt-5 border-t pt-5"
              >
                <ColumnHeading id="combo-contents-heading">
                  Included in this combo ({comboItems.length})
                </ColumnHeading>

                <ul className="mt-3 flex flex-col gap-2">
                  {comboItems.map((item, index) => {
                    const meta = [
                      item.type ? KIND_LABEL[item.type] : null,
                      item.durationLabel
                        ? [item.durationLabel, daysText(item.days)].filter(Boolean).join(', ')
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')

                    const body = (
                      <>
                        <span className="bg-green-50 relative size-16 shrink-0 overflow-hidden rounded-md">
                          <Image
                            alt={item.image ? item.image.alt?.trim() || item.title : ''}
                            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100"
                            fill
                            sizes="64px"
                            src={item.image ? srcOf(item.image) : PRODUCT_PLACEHOLDER}
                          />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-sm text-ink-900 line-clamp-2 font-semibold leading-snug">
                            {item.title}
                          </span>
                          {meta ? <span className="text-caption text-ink-600">{meta}</span> : null}
                        </span>
                        {item.slug ? (
                          <ArrowUpRight
                            aria-hidden="true"
                            className="text-green-700 size-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                            strokeWidth={2}
                          />
                        ) : null}
                      </>
                    )
                    const row = 'group flex items-center gap-3 rounded-md p-1.5 pr-3'

                    return (
                      <li key={`${item.title}-${index}`}>
                        {item.slug ? (
                          <Link
                            className={cn(
                              row,
                              'transition-colors hover:bg-green-50 focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none motion-reduce:transition-none',
                            )}
                            href={productHref(item.slug)}
                          >
                            {body}
                          </Link>
                        ) : (
                          <div className={row}>{body}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}
          </div>
        </div>

        {/* Full width under the columns: the description and the details. */}
        <div className="border-line mt-12 grid gap-10 border-t pt-10 lg:grid-cols-12">
          {hasReading ? (
            <div className="min-w-0 lg:col-span-7">
              {product.description ? (
                <section aria-labelledby="product-description-heading">
                  <h2 className="text-h2" id="product-description-heading">
                    Product description
                  </h2>
                  <RichText
                    className="text-body text-ink-600 mx-0 mt-6 max-w-[68ch]"
                    data={product.description}
                    enableGutter={false}
                  />
                </section>
              ) : null}

              {isCombo ? (
                <Notice className={product.description ? 'mt-8' : ''} title="A note on our meals">
                  Our meals are food options and are not a substitute for medical or nutritional
                  advice.
                </Notice>
              ) : null}

              {!isAvailable ? (
                <Notice className="mt-8" title={PRODUCTS_PAUSED_NOTE_TITLE}>
                  {PRODUCTS_PAUSED_NOTE_BODY}
                </Notice>
              ) : null}
            </div>
          ) : null}

          <section
            aria-labelledby="product-details-heading"
            className={cn('min-w-0', hasReading ? 'lg:col-span-5' : 'lg:col-span-7')}
          >
            <h2 className="text-h2" id="product-details-heading">
              Product details
            </h2>
            <dl className="border-line mt-6 overflow-hidden rounded-lg border">
              {details.map(([term, value]) => (
                <div
                  className="border-line grid grid-cols-[8rem_minmax(0,1fr)] border-b last:border-b-0"
                  key={term}
                >
                  <dt className="bg-green-50 text-ink-900 px-4 py-3 text-sm font-bold">{term}</dt>
                  <dd className="text-ink-600 px-4 py-3 text-sm wrap-anywhere">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </Section>

      {related && related.length > 0 ? (
        <Section tone="tint">
          <h2 className="text-h2">{PRODUCTS_RELATED_HEADING}</h2>

          <ul
            aria-label={PRODUCTS_RELATED_HEADING}
            className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
          >
            {related.map((item) => (
              <li className="min-w-0" key={item.id}>
                <ProductCard
                  product={item}
                  returnPath={productHref(product.slug)}
                  sizes="(min-width: 64rem) 25vw, (min-width: 48rem) 30vw, 45vw"
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </main>
  )
}
