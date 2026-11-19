import { hasComboItems } from '@/utilities/productKind'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { CTA_BASE, CTA_SIZES, CTA_VARIANTS } from '@/components/Cta'
import { Media } from '@/components/Media'
import type { Product } from '@/payload-types'
import { ONE_TIME_DURATION } from '@/utilities/cart'
import { productSizes } from '@/utilities/cartLines'
import {
  comboItemTitles,
  comboSavingPaise,
  comboSeparatePrice,
  isProductSellable,
} from '@/utilities/combos'
import { leadPricePaise } from '@/utilities/leadPrice'
import { formatPaise } from '@/utilities/money'
import { productPhotos } from '@/utilities/productPhotos'
import { productHref } from '@/utilities/productsCategoryCopy'
import {
  PRODUCT_CHOOSE_PLAN,
  PRODUCT_CHOOSE_SIZE,
  PRODUCT_KIND_LABEL,
  PRODUCTS_CARD_FROM,
} from '@/utilities/productsCopy'
import { cn } from '@/utilities/ui'

import { ProductCardActions } from './ProductCardActions'
import { PRODUCT_PLACEHOLDER } from './productPlaceholder'

const PHOTO_PILL =
  'rounded-pill inline-flex items-center px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase shadow-sm'

/** Each kind's own colour, carried by the dot beside its label. */
const KIND_DOT: Record<Product['type'], string> = {
  combo: 'bg-gold-500',
  'one-time': 'bg-green-500',
  plan: 'bg-green-700',
}

const SAVE_PILL = 'rounded-pill bg-gold-100 px-2 py-0.5 text-[11px] font-bold text-green-900'

/**
 * One product, anywhere the site lists products (design.md §6.15).
 *
 * A white card: the photo (the second photo fades in on hover), the kind of
 * product as a small label, the name, then what each kind needs:
 *
 * - **Meal plan** — its cheapest duration's price and one **Choose plan** button to
 *   its page, where the duration is chosen; nothing is added on the shopper's
 *   behalf.
 * - **One-time purchase** — the price, with any old price and % off, and Add to
 *   cart / Buy now. Sold in sizes, it leads with the cheapest size and offers
 *   **Choose size** instead.
 * - **Meal combo** — what is inside, the price with the bought-separately
 *   total struck through and the saving, and Add to cart / Buy now.
 *
 * A paused product keeps its price readable and has nothing to add. The photo
 * and the name both open the product's page; only the name is a tab stop.
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
  const [image = null, hoverImage = null] = productPhotos(product)
  const href = productHref(product.slug)
  // A record without a kind reads as a meal plan, as it does in the cart.
  const kind: Product['type'] = product.type ?? 'plan'
  const isPlan = kind === 'plan'
  const isOneTime = kind === 'one-time'
  const isCombo = kind === 'combo'
  const isAvailable = isProductSellable(product)

  const flatPrice =
    !isPlan && typeof product.price === 'number' && Number.isFinite(product.price) && product.price >= 1
      ? product.price
      : null
  const sizeOptions = isOneTime ? productSizes(product) : []
  const sizedProduct = sizeOptions.length > 0

  /* The price each kind leads with. */
  const storedLead =
    typeof product.fromPrice === 'number' && product.fromPrice > 0 ? product.fromPrice : null
  const planLead = isPlan ? (leadPricePaise(product) ?? storedLead) : null
  const price = isPlan
    ? planLead !== null
      ? `${PRODUCTS_CARD_FROM} ${formatPaise(planLead)}`
      : undefined
    : flatPrice !== null
      ? sizedProduct
        ? `${PRODUCTS_CARD_FROM} ${formatPaise(flatPrice)}`
        : formatPaise(flatPrice)
      : undefined

  /* What the price is struck against: a one-time product's old price, or what
     a combo's items cost bought one by one. */
  const struckPrice =
    flatPrice === null || sizedProduct
      ? null
      : isOneTime && typeof product.compareAtPrice === 'number' && product.compareAtPrice > flatPrice
        ? product.compareAtPrice
        : isCombo && comboSavingPaise(product) > 0
          ? comboSeparatePrice(product)
          : null
  const discount =
    isOneTime && struckPrice !== null && flatPrice !== null
      ? Math.floor(((struckPrice - flatPrice) / struckPrice) * 100)
      : 0
  const comboSaving = isCombo ? comboSavingPaise(product) : 0
  // A meal plan can hold items too, so the items follow the Combo tick.
  const comboItems = hasComboItems(product) ? comboItemTitles(product) : []

  /* Plans and sized products are chosen on their page; the rest add here. */
  const choosesOnPage = isPlan || sizedProduct
  const canAddHere = isAvailable && !choosesOnPage && flatPrice !== null

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
            pictureClassName="absolute inset-0"
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

        {/* The second photo waits on top, hidden, and fades in while the card
            is pointed at or focused, so hover shows the product another way. */}
        {image?.url && hoverImage?.url ? (
          <Media
            alt=""
            className="absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"
            fill
            imgClassName="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
            pictureClassName="absolute inset-0"
            resource={hoverImage}
            size={sizes}
          />
        ) : null}

        {!isAvailable ? (
          <span className={`${PHOTO_PILL} bg-gold-400 absolute top-2 left-2 text-green-900`}>
            Paused
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col px-2 pt-3 pb-1">
        <p className="text-ink-600 flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
          <span aria-hidden="true" className={cn('size-1.5 rounded-full', KIND_DOT[kind])} />
          {PRODUCT_KIND_LABEL[kind]}
        </p>

        <h3 className="text-body text-ink-900 mt-1 line-clamp-2 leading-snug font-semibold">
          <Link
            className="rounded-sm underline-offset-4 hover:text-green-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
            href={href}
          >
            {product.title}
          </Link>
        </h3>

        {comboItems.length > 0 ? (
          <p className="text-ink-600 mt-1 line-clamp-2 text-xs leading-5">
            {comboItems.join(' + ')}
          </p>
        ) : null}

        {isOneTime && !sizedProduct && product.packSize ? (
          <p className="text-ink-600 mt-0.5 text-xs">{product.packSize}</p>
        ) : null}

        {sizedProduct ? (
          <p className="text-ink-600 mt-1 line-clamp-1 text-xs">
            {sizeOptions.map((size) => size.label).join(' · ')}
          </p>
        ) : null}

        {price ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-body font-bold text-green-700 tabular-nums">{price}</span>
            {struckPrice !== null ? (
              <del className="text-ink-600 text-xs tabular-nums">{formatPaise(struckPrice)}</del>
            ) : null}
            {discount >= 1 ? <span className={SAVE_PILL}>{discount}% OFF</span> : null}
            {comboSaving > 0 ? (
              <span className={cn(SAVE_PILL, 'tabular-nums')}>Save {formatPaise(comboSaving)}</span>
            ) : null}
          </p>
        ) : null}

        {isAvailable && choosesOnPage && price ? (
          <div className="mt-auto pt-3">
            <Link
              aria-label={`${isPlan ? PRODUCT_CHOOSE_PLAN : PRODUCT_CHOOSE_SIZE} for ${product.title}`}
              className={cn(CTA_BASE, CTA_SIZES.small, CTA_VARIANTS.primary, 'w-full px-1 text-xs uppercase')}
              href={href}
            >
              {isPlan ? PRODUCT_CHOOSE_PLAN : PRODUCT_CHOOSE_SIZE}
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
            </Link>
          </div>
        ) : canAddHere ? (
          <div className="mt-auto pt-3">
            <ProductCardActions
              durationLabel={ONE_TIME_DURATION}
              oneTime
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
