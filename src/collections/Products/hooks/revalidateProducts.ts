import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidateTag } from 'next/cache'

import type { Product } from '@/payload-types'

/**
 * Clearing the homepage Best sellers shelf when a product changes.
 *
 * `getFeaturedHomeProducts` caches featured products under the `products` tag,
 * so a price or availability change must clear it.
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
