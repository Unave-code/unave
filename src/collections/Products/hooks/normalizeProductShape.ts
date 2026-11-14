import type { CollectionBeforeChangeHook } from 'payload'

import type { Product } from '@/payload-types'

/**
 * Each kind of product keeps only its own fields.
 *
 * The admin hides the fields that do not belong to the chosen kind, but hiding
 * a field does not empty it: a meal plan switched to a one-time product would
 * otherwise carry its old durations forever, and a combo switched back to a
 * plan would keep its contents. This clears whatever the kind does not use, on
 * every save, so the record always says one thing.
 *
 * A partial update that does not name the kind reads it from the stored record,
 * and a field the update does not mention is only cleared when the kind itself
 * changed — so toggling Available never rewrites the pricing.
 */
export const normalizeProductShape: CollectionBeforeChangeHook<Product> = ({
  data,
  originalDoc,
}) => {
  const type = data.type ?? originalDoc?.type
  if (!type) return data

  const kindChanged = Boolean(originalDoc?.type && data.type && data.type !== originalDoc.type)
  const clear = <K extends keyof Product>(key: K, empty: Product[K]) => {
    if (kindChanged || key in data) {
      ;(data as Partial<Product>)[key] = empty
    }
  }

  if (type === 'plan') {
    clear('price', null)
    clear('compareAtPrice', null)
    clear('packSize', null)
    clear('components', [])
  } else if (type === 'one-time') {
    clear('durations', [])
    clear('components', [])
  } else if (type === 'combo') {
    clear('durations', [])
    clear('compareAtPrice', null)
    clear('packSize', null)
  }

  return data
}
