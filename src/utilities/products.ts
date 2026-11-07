import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import type { Product } from '@/payload-types'

/**
 * The products the homepage advertises (design.md §10.1).
 *
 * The shelf is a window onto the same collection `/products` reads, so a price
 * can never be typed twice. It takes the newest open products, in the order
 * `/products` lists them, and stops at four because a homepage is a shelf, not
 * a catalogue. A paused product is never advertised: its label belongs on
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

  const found = await payload.find({
    collection: 'products',
    depth: 1,
    limit,
    where: { available: { equals: true } },
  })

  return found.docs
}

export const getHomeProducts = (limit = HOME_PRODUCT_COUNT) =>
  unstable_cache(() => findOpenProducts(limit), ['home-products', String(limit)], {
    tags: ['products'],
  })
