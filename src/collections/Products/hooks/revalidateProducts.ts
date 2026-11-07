import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidateTag } from 'next/cache'

import type { Product } from '@/payload-types'

/**
 * Clearing the homepage shelf when a product changes.
 *
 * `getHomeProducts` caches the four products under the `products` tag, so a
 * price or a pause edited in the admin has to knock that cache over or the front
 * page would keep advertising the old one until the next rebuild.
 */
export const revalidateProducts: CollectionAfterChangeHook<Product> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating products`)

    revalidateTag('products', 'max')
    revalidateTag('pages-sitemap', 'max')
  }

  return doc
}

export const revalidateProductsDelete: CollectionAfterDeleteHook<Product> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating products after delete`)

    revalidateTag('products', 'max')
    revalidateTag('pages-sitemap', 'max')
  }

  return doc
}
