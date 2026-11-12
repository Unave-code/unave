import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { Subcategory } from '@/payload-types'

export const revalidateSubcategories: CollectionAfterChangeHook<Subcategory> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    payload.logger.info('Revalidating subcategories')
    revalidateTag('subcategories', 'max')
  }

  return doc
}

export const revalidateSubcategoriesDelete: CollectionAfterDeleteHook<Subcategory> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    payload.logger.info('Revalidating subcategories after delete')
    revalidateTag('subcategories', 'max')
  }

  return doc
}
