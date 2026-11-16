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
    clear('sizes', [])
  } else if (type === 'one-time') {
    clear('durations', [])
    clear('components', [])
    clear('howItWorks', null)

    /* Sold in sizes: the product's own price becomes the cheapest size, so the
       lead price, the shelf's price sort and its filters keep working, and the
       single-size old price and pack size step aside. */
    const sizes = 'sizes' in data ? data.sizes : originalDoc?.sizes
    const prices = (sizes ?? [])
      .map((size) => Number(size?.price))
      .filter((price) => Number.isSafeInteger(price) && price >= 1)

    if (prices.length > 0) {
      data.price = Math.min(...prices)
      data.compareAtPrice = null
      data.packSize = null
    }
  } else if (type === 'combo') {
    clear('durations', [])
    clear('compareAtPrice', null)
    clear('packSize', null)
    clear('sizes', [])
    clear('howItWorks', null)
  }

  return data
}
