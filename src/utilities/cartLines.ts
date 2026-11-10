import type { Payload } from 'payload'

import type { Product } from '@/payload-types'

import type { CartLine } from './cart'
import { cartLineKey, ONE_TIME_DURATION } from './cart'

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
  duration: string
  key: string
  /** What the line charges: the unit price times the quantity. */
  lineTotal: number
  price: null | number
  productId: null | number | string
  productTitle: string
  qty: number
  reason: null | StaleReason
  slug: string
  stale: boolean
  /** What the record says the product is. A line with no record reads as a plan. */
  type: 'one-time' | 'plan'
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

/** A quantity a page or a sum can trust, whatever the caller handed over. */
const safeQty = (qty: number): number =>
  Number.isFinite(qty) && qty >= 1 ? Math.round(qty) : 1

export const resolveCartLines = async ({
  lines,
  payload,
}: {
  lines: CartLine[]
  payload: Payload
}): Promise<ResolvedCart> => {
  const slugs = [...new Set(lines.map((line) => line.product))]
  const productsBySlug = new Map<string, Product>()

  if (slugs.length > 0) {
    const found = await payload.find({
      collection: 'products',
      depth: 0,
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
    const product = productsBySlug.get(line.product) ?? null
    const type: 'one-time' | 'plan' = product?.type === 'one-time' ? 'one-time' : 'plan'
    const qty = safeQty(line.qty)

    // A meal plan prices through its chosen duration; a one-time product prices
    // through the single price on the record, and only the reserved duration
    // label may carry it — anything else is a line the cookie invented.
    const duration =
      type === 'one-time' ? null : productDuration(product, line.duration)
    const oneTimePrice =
      type === 'one-time' && line.duration === ONE_TIME_DURATION
        ? Number(product?.price)
        : Number.NaN

    let price: null | number
    let days: null | number

    if (type === 'one-time') {
      price = Number.isFinite(oneTimePrice) && oneTimePrice >= 1 ? oneTimePrice : null
      days = null
    } else {
      price = duration?.price ?? null
      days = duration?.days ?? null
    }

    let reason: null | StaleReason = null

    if (!product) reason = 'unknown-product'
    else if (!product.available) reason = 'paused'
    else if (price === null) reason = 'missing-duration'

    return {
      days,
      duration: line.duration,
      key,
      lineTotal: (price ?? 0) * qty,
      price,
      productId: product?.id ?? null,
      productTitle: product?.title ?? line.product,
      qty,
      reason,
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
