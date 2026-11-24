import Link from 'next/link'
import React from 'react'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Section } from '@/components/home/Section'
import type { Product } from '@/payload-types'
import { audienceTitle } from '@/utilities/audiences'
import { productSizes } from '@/utilities/cartLines'
import {
  comboSavingPaise,
  comboSeparatePrice,
  isProductSellable,
  selectedComboDuration,
} from '@/utilities/combos'
import { formatPaise } from '@/utilities/money'
import { PRODUCT_BACK_LABEL } from '@/utilities/productPageCopy'
import { productPhotos } from '@/utilities/productPhotos'
import { hasComboItems } from '@/utilities/productKind'
import { PRODUCT_KIND_LABEL } from '@/utilities/productsCopy'
import {
  CATEGORY_LABEL,
  categoryBadgeAriaLabel,
  productCategoryHref,
} from '@/utilities/productsCategoryCopy'
import { cn } from '@/utilities/ui'

import { ProductGallery, type GalleryImage } from '../ProductGallery'
import type { ProductDuration } from '../ProductPurchase'
import { Benefits } from './Benefits'
import { BuyPanel } from './BuyPanel'
import { ComboContents } from './ComboContents'
import { ProductInfo } from './ProductInfo'
import { RelatedProducts } from './RelatedProducts'
import { CHIP, type ComboItem, mediaOf, srcOf } from './shared'


/**
 * One product's own page (design.md §6.15), laid out as a shop page.
 *
 * Two equal columns from `md`: the large photo with its thumbnails under it on
 * the left, and beside it everything needed to choose and buy, in reading
 * order — the chips, the name, whether it is in stock, on a combo what is
 * inside it and its saving, the buy panel (price, options, quantity, Add to
 * cart and Buy now), what you get as a checklist, the key facts as a short
 * list, then the description. On a phone it all stacks, gallery first.
 *
 * Below the columns, full width bands: the product's benefits on gold brush
 * strokes, then "people also bought" from the same
 * shelf. Nothing here is invented — no ratings, no delivery promises.
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
  /** The shared "How your plan works" lines, one step per line. */
  planHowItWorks?: null | string
  whatsapp?: null | string
}> = ({ planHowItWorks, product, related, whatsapp }) => {
  const durations: ProductDuration[] = (product.durations ?? []).map((duration) => ({
    days: Number(duration.days),
    label: duration.label,
    price: Number(duration.price),
  }))

  const isOneTime = product.type === 'one-time'
  /* Combo: the items inside show (a meal plan can hold items too). Meal plan:
     bought by duration. A plain combo has one price, like a single item. */
  const isCombo = hasComboItems(product)
  // A record without a kind reads as a meal plan, as it does in the cart.
  const isPlan = product.type !== 'one-time' && product.type !== 'combo'
  const isAvailable = isProductSellable(product)
  const oneTimePrice = Number(product.price)
  const buyableOneTime = !isPlan && oneTimePrice >= 1

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

  const benefits = (product.benefits ?? []).filter((benefit) => benefit.title?.trim())

  const audience = audienceTitle(product.audience)
  const subcategory =
    product.subcategory && typeof product.subcategory === 'object'
      ? product.subcategory.title
      : null

  /* The gallery: the product's own photos first (the main photo and up to
     four more), then on a combo a photo of each item that has one, captioned
     with the item's name. */
  const ownPhotos = productPhotos(product)
  const gallery: GalleryImage[] = [
    ...ownPhotos.map((photo, index) => ({
      alt: photo.alt?.trim() || `${product.title}, photo ${index + 1}`,
      caption: isCombo ? product.title : undefined,
      src: srcOf(photo),
    })),
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
  const comboSaving = isCombo ? comboSavingPaise(product) : 0

  /* A one-time product sold in sizes: each size has its own price. */
  const sizeOptions = isOneTime ? productSizes(product) : []

  /* "How your plan works": the plan's own lines, else the shared lines. */
  const howItWorksSteps = (product.howItWorks?.trim() || planHowItWorks || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const details: [string, string][] = [
    ['Kind', PRODUCT_KIND_LABEL[product.type]],
    ...(product.category
      ? [['Category', CATEGORY_LABEL[product.category]] as [string, string]]
      : []),
    ...(subcategory ? [['Type', subcategory] as [string, string]] : []),
    ...(audience ? [['For', audience] as [string, string]] : []),
    ...(product.packSize ? [['Pack size', product.packSize] as [string, string]] : []),
    ...(sizeOptions.length > 0
      ? [['Sizes', sizeOptions.map((size) => size.label).join(', ')] as [string, string]]
      : []),
    ...(isCombo && comboItems.length > 0
      ? [['Items', `${comboItems.length} in one combo`] as [string, string]]
      : []),
  ]

  const hasReading = Boolean(product.description) || !isAvailable

  return (
    <main>
      <Section className="pt-6 md:pt-10" tone="white">
        <Breadcrumbs
          items={[
            { href: '/products', label: PRODUCT_BACK_LABEL },
            ...(product.category
              ? [{ href: productCategoryHref(product.category), label: CATEGORY_LABEL[product.category] }]
              : []),
            { label: product.title },
          ]}
        />

        <div className="mt-6 grid items-start gap-8 md:grid-cols-2 lg:gap-14">
          {/* Left: the large photo with its thumbnails underneath. */}
          <div className="min-w-0">
            <ProductGallery images={gallery} paused={!isAvailable} />
          </div>

          {/* Right, in reading order: the name, whether it can be ordered,
              the price and the choice, the buy row, the key facts, then the
              description. */}
          <div className="min-w-0">
            {product.category || audience ? (
              <div className="mb-4 flex flex-wrap items-center gap-2">
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
                {audience ? (
                  <span className={cn(CHIP, 'ring-line text-ink-600 ring-1 ring-inset')}>
                    {audience}
                  </span>
                ) : null}
              </div>
            ) : null}

            <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.01em] text-balance text-green-900 capitalize md:text-[36px]">
              {product.title}
            </h1>

            <p className="text-caption text-ink-600 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
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
                {isAvailable ? 'In stock' : 'Paused for now'}
              </span>
              {product.packSize ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{product.packSize}</span>
                </>
              ) : null}
            </p>

            {/* A combo shows what is inside first, as photo cards, before
                its price: what you get decides whether the price is good. */}
            {isCombo && comboItems.length > 0 ? (
              <ComboContents comboItems={comboItems} />
            ) : null}

            {comboSaving > 0 && separate !== null ? (
              <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-ink-600">
                  Bought separately <del className="tabular-nums">{formatPaise(separate)}</del>
                </span>
                <span className="rounded-pill bg-[var(--success-surface)] text-success px-2.5 py-1 text-xs font-bold tabular-nums">
                  You save {formatPaise(comboSaving)}
                </span>
              </p>
            ) : null}

            <BuyPanel
              buyableOneTime={buyableOneTime}
              compareAt={compareAt}
              durations={durations}
              isAvailable={isAvailable}
              isPlan={isPlan}
              oneTimePrice={oneTimePrice}
              product={product}
              sizeOptions={sizeOptions}
              whatsapp={whatsapp}
            />

            <ProductInfo
              details={details}
              hasReading={hasReading}
              howItWorksSteps={howItWorksSteps}
              isAvailable={isAvailable}
              isPlan={isPlan}
              points={points}
              product={product}
            />
          </div>
        </div>
      </Section>

      {/* Benefits: cream on the deep green band, split by thin gold rules. */}
      {benefits.length > 0 ? (
        <Benefits benefits={benefits} title={product.title} />
      ) : null}

      {/* People also bought: the rest of the same shelf with its buy buttons. */}
      {related && related.length > 0 ? (
        <RelatedProducts productSlug={product.slug} related={related} />
      ) : null}
    </main>
  )
}
