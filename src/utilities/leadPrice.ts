import type { Product } from '@/payload-types'

/**
 * What a product leads with on the shelf, in paise (design.md §6.15).
 *
 * A meal plan is sold by duration, so the number a shopper reads first is its
 * cheapest per-day rate, floored to whole rupees: "From ₹59 a day" leads to the
 * running cost without promising more precision than the price it came from
 * carries. A one-time purchase has one price and leads with it.
 *
 * This is the one place that rule lives. The card renders it, the `fromPrice`
 * field stores it so the shelf can sort and filter on it, and the guard against
 * a rate that floors to zero means a near-free day or two leads with nothing
 * rather than a nonsense "From ₹0". It answers `null` when a product has no
 * price to lead with at all.
 */
export const perDayPaise = (pricePaise: number, days: number): number =>
  Math.floor(pricePaise / days / 100) * 100

export interface LeadPriceSource {
  durations?: null | Product['durations']
  price?: null | number
  type?: null | Product['type']
}

export const leadPricePaise = (product: LeadPriceSource): null | number => {
  if (product.type === 'one-time') {
    const price = Number(product.price)

    return Number.isFinite(price) && price >= 1 ? price : null
  }

  const rates = (product.durations ?? [])
    .filter((duration) => Number(duration.days) > 0)
    .map((duration) => perDayPaise(Number(duration.price), Number(duration.days)))
    .filter((rate) => rate > 0)

  return rates.length > 0 ? Math.min(...rates) : null
}
