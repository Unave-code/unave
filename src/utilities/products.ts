import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import type { Where } from 'payload'

import type { Product } from '@/payload-types'

/**
 * The products the homepage advertises (design.md §10.1).
 *
 * The shelf is a window onto the same collection `/products` reads, so a price
 * can never be typed twice. Featured open products come first, in the order
 * `/products` lists them, and the newest open products fill the rest up to four:
 * a homepage is a shelf, not a catalogue. Marking a product featured in the
 * admin is how staff choose what the front page leads with, and a kitchen that
 * has not featured anything still gets a shelf of its newest work.
 *
 * A paused product is never advertised, featured or not: its label belongs on
 * `/products`, where the customer is already comparing them, not on the front
 * page.
 *
 * The query is cached under the `products` tag, which the Products collection's
 * own hooks clear (src/collections/Products/hooks/revalidateProducts.ts), so a
 * price edited in the admin shows on the homepage without a rebuild.
 */

/** How many products the homepage shows. */
export const HOME_PRODUCT_COUNT = 4

const findOpenProducts = async (limit: number): Promise<Product[]> => {
  const payload = await getPayload({ config: configPromise })

  const featured = await payload.find({
    collection: 'products',
    depth: 1,
    limit,
    sort: '-createdAt',
    where: {
      and: [{ available: { equals: true } }, { featured: { equals: true } }],
    },
  })

  if (featured.docs.length >= limit) return featured.docs

  // Top the shelf up with the newest open products, skipping the ones already
  // picked so a product can never appear twice.
  const where: Where = featured.docs.length
    ? {
        and: [
          { available: { equals: true } },
          { id: { not_in: featured.docs.map((product) => product.id) } },
        ],
      }
    : { available: { equals: true } }

  const rest = await payload.find({
    collection: 'products',
    depth: 1,
    limit: limit - featured.docs.length,
    sort: '-createdAt',
    where,
  })

  return [...featured.docs, ...rest.docs]
}

export const getHomeProducts = (limit = HOME_PRODUCT_COUNT) =>
  unstable_cache(() => findOpenProducts(limit), ['home-products', String(limit)], {
    tags: ['products'],
  })

/** How many related products a product page offers under its points. */
export const RELATED_PRODUCT_COUNT = 3

/**
 * The products shown under a product's points (design.md §6.15): the rest of
 * the same shelf — the same category, this one left out — newest first. Open
 * and paused alike, since the shelf itself shows both. The query runs on every
 * request like the product's own, so a price the kitchen edits is on the page
 * the moment it saves.
 */
export const fetchRelatedProducts = async (
  product: Product,
  limit = RELATED_PRODUCT_COUNT,
): Promise<Product[]> => {
  if (!product.category) return []

  const payload = await getPayload({ config: configPromise })

  const related = await payload.find({
    collection: 'products',
    depth: 1,
    limit,
    sort: '-createdAt',
    where: {
      and: [{ category: { equals: product.category } }, { id: { not_equals: product.id } }],
    },
  })

  return related.docs
}
