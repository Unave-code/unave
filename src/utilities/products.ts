import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import type { Payload } from 'payload'

import type { Product, Subcategory } from '@/payload-types'

/**
 * Available, featured products for the homepage Best sellers section.
 */

/** Best sellers fit three rows of five on a wide screen. */
export const HOME_BEST_SELLER_COUNT = 15

const findFeaturedHomeProducts = async (payload: Payload, limit: number): Promise<Product[]> => {
  const result = await payload.find({
    collection: 'products',
    depth: 1,
    limit,
    sort: '-createdAt',
    where: {
      and: [{ available: { equals: true } }, { featured: { equals: true } }],
    },
  })

  return result.docs
}

export const getFeaturedHomeProducts = (limit = HOME_BEST_SELLER_COUNT) =>
  unstable_cache(
    async () => {
      const payload = await getPayload({ config: configPromise })
      return findFeaturedHomeProducts(payload, limit)
    },
    ['featured-home-products', String(limit)],
    {
      tags: ['products'],
    },
  )

const findHomeSubcategories = async (): Promise<Subcategory[]> => {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'subcategories',
    depth: 1,
    limit: 100,
    sort: 'title',
  })

  return result.docs
}

export const getHomeSubcategories = () =>
  unstable_cache(findHomeSubcategories, ['home-subcategories'], {
    tags: ['subcategories'],
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
