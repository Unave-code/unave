import type { CollectionBeforeChangeHook } from 'payload'

import type { Product } from '@/payload-types'
import { leadPricePaise } from '@/utilities/leadPrice'

/**
 * Keeping `fromPrice` in step with the card (design.md §6.15).
 *
 * The shelf sorts and filters by price, and a product's lead price is not a
 * column: it is the cheapest per-day rate across a plan's durations, or the
 * flat price of a one-time purchase. Postgres cannot read that out of the
 * durations array, so every save writes the number the card leads with onto the
 * row, in paise, through the one function that owns that rule.
 *
 * Nothing in the admin edits the field: it is derived, and it is read only
 * there.
 */
export const setLeadPrice: CollectionBeforeChangeHook<Product> = ({ data }) => ({
  ...data,
  fromPrice: leadPricePaise({
    durations: data.durations,
    price: data.price,
    type: data.type,
  }),
})
