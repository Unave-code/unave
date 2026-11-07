import type { Payload } from 'payload'

import type { Product } from '@/payload-types'

import type { CartLine } from './cart'
import { cartLineKey } from './cart'

/**
 * Resolving the cart against the live product records (spec 0007, AC-3 and AC-5).
 *
 * The cookie only names a product and a duration. Every title, day count and
 * price comes from the database here, on the server, so a tampered or stale
 * cookie can never decide an amount. A line that no longer resolves is kept in
 * the list, marked stale, and excluded from the total: the cart page then shows
 * the customer which line needs removing instead of quietly dropping it.
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
  price: null | number
  productId: null | number | string
  productTitle: string
  reason: null | StaleReason
  slug: string
  stale: boolean
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
    const duration = productDuration(product, line.duration)

    let reason: null | StaleReason = null

    if (!product) reason = 'unknown-product'
    else if (!product.available) reason = 'paused'
    else if (!duration) reason = 'missing-duration'

    return {
      days: duration?.days ?? null,
      duration: line.duration,
      key,
      price: duration?.price ?? null,
      productId: product?.id ?? null,
      productTitle: product?.title ?? line.product,
      reason,
      slug: line.product,
      stale: reason !== null,
    }
  })

  const usable = all.filter((line) => !line.stale)
  const stale = all.filter((line) => line.stale)
  const total = usable.reduce((sum, line) => sum + (line.price ?? 0), 0)

  return { all, stale, total, usable }
}
