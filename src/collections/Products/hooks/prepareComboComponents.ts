import type { CollectionBeforeChangeHook } from 'payload'

import type { Product } from '@/payload-types'
import { hasComboItems, isMealPlan } from '@/utilities/productKind'

/**
 * Snapshots each combo item's name, so an order or a deleted item still reads
 * as what was sold. Only single items go inside a combo, so no item carries a
 * duration of its own.
 */
export const prepareComboComponents: CollectionBeforeChangeHook<Product> = async ({
  data,
  originalDoc,
  req,
}) => {
  const kind = {
    combo: data.combo ?? originalDoc?.combo,
    mealPlan: data.mealPlan ?? originalDoc?.mealPlan,
    type: data.type ?? originalDoc?.type,
  }
  const rows = data.components ?? originalDoc?.components
  if (!hasComboItems(kind) || !Array.isArray(rows)) return data

  const components = await Promise.all(
    rows.map(async (component) => {
      const id =
        typeof component.product === 'object' && component.product !== null
          ? component.product.id
          : component.product

      if (typeof id !== 'number' && typeof id !== 'string') return component

      const product = await req.payload.findByID({
        collection: 'products',
        depth: 0,
        id,
        overrideAccess: true,
      })

      return {
        ...component,
        durationLabel: '',
        durationDaysSnapshot: null,
        productTitleSnapshot: product.title,
      }
    }),
  )

  return {
    ...data,
    compareAtPrice: null,
    components,
    // A meal plan combo is priced by its durations; a plain combo has none.
    ...(isMealPlan(kind) ? {} : { durations: [] }),
    packSize: null,
  }
}
