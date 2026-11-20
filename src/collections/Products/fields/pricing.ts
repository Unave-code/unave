import { isSingleItem } from '../../../utilities/productKind'

export type PricingData =
  | { combo?: boolean | null; mealPlan?: boolean | null; sizes?: unknown; type?: null | string }
  | undefined

/** A single item sold in sizes prices each size, not the product. */
export const soldBySize = (data: PricingData): boolean =>
  isSingleItem(data) && Array.isArray(data?.sizes) && data.sizes.length > 0
