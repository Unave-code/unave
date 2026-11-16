import type { Product } from '@/payload-types'

/**
 * What a product leads with on the shelf, in paise (design.md §6.15).
 *
 * A meal plan is sold by duration, so it leads with its cheapest duration's
 * total ("From ₹1,200"). A one-time purchase or a combo has one price and leads
 * with it.
 *
 * This is the one place that rule lives. The card renders it and the
 * `fromPrice` field stores it so the shelf can sort and filter on it. It
 * answers `null` when a product has no price to lead with at all.
 */
export interface LeadPriceSource {
  durations?: null | Product['durations']
  price?: null | number
  type?: null | Product['type']
}

export const leadPricePaise = (product: LeadPriceSource): null | number => {
  if (product.type === 'one-time' || product.type === 'combo') {
    const price = Number(product.price)

    return Number.isFinite(price) && price >= 1 ? price : null
  }

  const totals = (product.durations ?? [])
    .map((duration) => Number(duration.price))
    .filter((price) => Number.isFinite(price) && price >= 1)

  return totals.length > 0 ? Math.min(...totals) : null
}
