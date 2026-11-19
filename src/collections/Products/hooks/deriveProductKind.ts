import type { CollectionBeforeValidateHook } from 'payload'

import type { Product } from '@/payload-types'
import { productTypeFor } from '@/utilities/productKind'

/**
 * Works out the stored `type` from the Combo and Meal plan ticks before
 * anything is validated, so every rule below reads one settled answer.
 *
 * A write that only names the old `type` (a script, or the API) sets the ticks
 * from it instead, and a partial update that names neither keeps what is
 * stored.
 */
export const deriveProductKind: CollectionBeforeValidateHook<Product> = ({ data, originalDoc }) => {
  if (!data) return data

  if (data.combo === undefined && data.mealPlan === undefined && data.type) {
    data.combo = data.type === 'combo'
    data.mealPlan = data.type === 'plan'
    return data
  }

  const combo = data.combo ?? originalDoc?.combo
  const mealPlan = data.mealPlan ?? originalDoc?.mealPlan

  if (combo === undefined && mealPlan === undefined) return data

  data.type = productTypeFor({
    combo: combo ?? undefined,
    mealPlan: mealPlan ?? undefined,
    type: originalDoc?.type,
  })

  return data
}
