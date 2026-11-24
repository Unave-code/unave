import { hasComboItems } from '@/utilities/productKind'
import type { Payload } from 'payload'

import type { Product } from '@/payload-types'

import type { CartLine } from './cart'
import { cartLineKey, ONE_TIME_DURATION } from './cart'
import { comboComponents, isProductSellable, type ComboComponentSnapshot } from './combos'
import {
  decodePlanSelection,
  LEGACY_PLAN_LINE,
  MEAL_PLANS_PATH,
  mealPlanPath,
  mealPlanSlugFromLine,
  normalizeMealPlan,
  type PlanBuilderData,
  pricePlanSelection,
} from './planBuilder'

/**
 * Resolving the cart against the live product records (spec 0007, AC-3 and AC-5).
 *
 * The cookie only names a product, a duration and a quantity. Every title, day
 * count and price comes from the database here, on the server, so a tampered or
 * stale cookie can never decide an amount. A line that no longer resolves is
 * kept in the list, marked stale, and excluded from the total: the cart page
 * then shows the customer which line needs removing instead of quietly dropping
 * it.
 *
 * A meal plan resolves through its durations. A one-time product — sold without
 * durations — resolves through the single price on the record, and only a line
 * carrying the reserved one-time duration can resolve at all.
 */

export type CartDuration = {
  days: number
  label: string
  price: number
}

export type StaleReason = 'missing-duration' | 'paused' | 'unknown-product'

export type ResolvedCartLine = {
  days: null | number
  components?: ComboComponentSnapshot[]
  /** A plain description to show instead of the raw duration (a built plan's choices). */
  detail?: null | string
  duration: string
  /** Where the line's title links; the product page unless set. */
  href?: string
  /** The product's photo for the cart and checkout lists, when it has one. */
  image?: { alt: string; url: string } | null
  key: string
  /** What the line charges: the unit price times the quantity. */
  lineTotal: number
  price: null | number
  productId: null | number | string
  productTitle: string
  qty: number
  reason: null | StaleReason
  /** The size a one-time line names, when the product is sold in sizes. */
  size?: null | string
  slug: string
  stale: boolean
  /** What the record says the product is. A line with no record reads as a plan. */
  type: 'combo' | 'one-time' | 'plan'
}

export type ResolvedCart = {
  all: ResolvedCartLine[]
  stale: ResolvedCartLine[]
  total: number
  usable: ResolvedCartLine[]
}

export const productDuration = (product: Product | null, label: string): CartDuration | null => {
  const match = product?.durations?.find(
    (duration) => duration.label.trim().toLowerCase() === label.trim().toLowerCase(),
  )

  if (!match) return null

  return {
    days: Number(match.days),
    label: match.label,
    price: Number(match.price),
  }
}

export type ProductSize = {
  compareAtPrice: null | number
  label: string
  price: number
}

/** The sizes a one-time product is sold in, cleaned; empty when it has none. */
export const productSizes = (product: null | Pick<Product, 'sizes'>): ProductSize[] =>
  (product?.sizes ?? [])
    .map((size) => ({
      compareAtPrice:
        typeof size?.compareAtPrice === 'number' && size.compareAtPrice > Number(size.price)
          ? size.compareAtPrice
          : null,
      label: String(size?.label ?? '').trim(),
      price: Number(size?.price),
    }))
    .filter((size) => size.label && Number.isSafeInteger(size.price) && size.price >= 1)

/** One size of a one-time product, found by its label (case-insensitive). */
export const productSize = (
  product: null | Pick<Product, 'sizes'>,
  label: string,
): null | ProductSize => {
  const wanted = label.trim().toLowerCase()
  return productSizes(product).find((size) => size.label.toLowerCase() === wanted) ?? null
}

/** A quantity a page or a sum can trust, whatever the caller handed over. */
const safeQty = (qty: number): number => (Number.isFinite(qty) && qty >= 1 ? Math.round(qty) : 1)

export const resolveCartLines = async ({
  lines,
  payload,
}: {
  lines: CartLine[]
  payload: Payload
}): Promise<ResolvedCart> => {
  const isPlanLine = (product: string) => product === LEGACY_PLAN_LINE || mealPlanSlugFromLine(product) !== null
  const slugs = [...new Set(lines.map((line) => line.product))].filter((slug) => !isPlanLine(slug))

  // A built plan prices from its meal plan, never from a product.
  const mealPlans = new Map<string, PlanBuilderData>()
  const planSlugs = [...new Set(lines.map((line) => mealPlanSlugFromLine(line.product)).filter(Boolean))] as string[]

  if (planSlugs.length > 0) {
    const found = await payload.find({
      collection: 'meal-plans',
      depth: 1,
      limit: planSlugs.length,
      overrideAccess: true,
      where: { slug: { in: planSlugs } },
    })
    for (const doc of found.docs) mealPlans.set(doc.slug, normalizeMealPlan(doc))
  }
  const productsBySlug = new Map<string, Product>()

  if (slugs.length > 0) {
    const found = await payload.find({
      collection: 'products',
      depth: 1,
      limit: 100,
      overrideAccess: true,
      where: { slug: { in: slugs } },
    })

    for (const product of found.docs as Product[]) {
      productsBySlug.set(product.slug, product)
    }
  }

  const all: ResolvedCartLine[] = lines.map((line) => {
    const key = cartLineKey(line)

    if (isPlanLine(line.product)) {
      const planSlug = mealPlanSlugFromLine(line.product)
      const plan = planSlug ? (mealPlans.get(planSlug) ?? null) : null
      const selection = decodePlanSelection(line.duration)
      const priced = plan && selection ? pricePlanSelection(plan, selection) : null
      // A plan line is the plan, so it is always one.
      const qty = 1

      return {
        days: priced?.days ?? null,
        detail: priced?.detail ?? null,
        duration: line.duration,
        href: plan ? mealPlanPath(plan.slug) : MEAL_PLANS_PATH,
        image: plan?.image ?? null,
        key,
        lineTotal: priced?.total ?? 0,
        price: priced?.total ?? null,
        productId: null,
        productTitle: plan ? `Meal plan: ${plan.title}` : 'Meal plan',
        qty,
        reason: priced ? null : plan ? 'missing-duration' : 'unknown-product',
        size: null,
        slug: line.product,
        stale: !priced,
        type: 'plan',
      }
    }

    const product = productsBySlug.get(line.product) ?? null
    const type: 'combo' | 'one-time' | 'plan' =
      product?.type === 'combo' ? 'combo' : product?.type === 'one-time' ? 'one-time' : 'plan'
    const qty = safeQty(line.qty)
    const components = product && hasComboItems(product) ? comboComponents(product) : null

    const duration = type === 'plan' ? productDuration(product, line.duration) : null
    /* A one-time product sold in sizes prices the size the line names; any
       other one-time product or combo prices the reserved one-time line. */
    const sized = type === 'one-time' && productSizes(product).length > 0
    const size = sized ? productSize(product, line.duration) : null
    const flatPrice = sized
      ? (size?.price ?? Number.NaN)
      : type !== 'plan' && line.duration === ONE_TIME_DURATION
        ? Number(product?.price)
        : Number.NaN

    let price: null | number
    let days: null | number

    if (type !== 'plan') {
      price = Number.isFinite(flatPrice) && flatPrice >= 1 ? flatPrice : null
      days = type === 'combo' ? 0 : null
    } else {
      price = duration?.price ?? null
      days = duration?.days ?? null
    }

    let reason: null | StaleReason = null

    if (!product) reason = 'unknown-product'
    else if (!isProductSellable(product)) reason = 'paused'
    else if (price === null) reason = 'missing-duration'

    return {
      days,
      ...(components ? { components } : {}),
      duration: line.duration,
      image:
        product?.image && typeof product.image === 'object' && product.image.url
          ? { alt: product.image.alt?.trim() || '', url: product.image.url }
          : null,
      key,
      lineTotal: (price ?? 0) * qty,
      price,
      productId: product?.id ?? null,
      productTitle: product?.title ?? line.product,
      qty,
      reason,
      size: size?.label ?? null,
      slug: line.product,
      stale: reason !== null,
      type,
    }
  })

  const usable = all.filter((line) => !line.stale)
  const stale = all.filter((line) => line.stale)
  const total = usable.reduce((sum, line) => sum + line.lineTotal, 0)

  return { all, stale, total, usable }
}
