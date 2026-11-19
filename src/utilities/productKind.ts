/**
 * What a product is, read from the two ticks staff set in the admin.
 *
 * Every product is a single item unless it is ticked as a **Combo** (it holds
 * other products) or a **Meal plan** (it is sold by duration), or both. The
 * stored `type` is worked out from the ticks on every save and is what the
 * cart, checkout and shelf read for pricing:
 *
 * - `plan` — Meal plan ticked (with or without items): priced per duration.
 * - `combo` — only Combo ticked: one fixed price for the items inside.
 * - `one-time` — neither: a single item with one price, or sizes.
 *
 * Records written before the ticks existed only carry `type`, so each helper
 * falls back to it.
 */
export interface ProductKindSource {
  combo?: boolean | null
  mealPlan?: boolean | null
  type?: null | string
}

export type ProductTypeValue = 'combo' | 'one-time' | 'plan'

/** Sold by duration: the Meal plan tick. */
export const isMealPlan = (product: null | ProductKindSource | undefined): boolean =>
  product?.mealPlan ?? product?.type === 'plan'

/** Holds other products: the Combo tick. */
export const hasComboItems = (product: null | ProductKindSource | undefined): boolean =>
  product?.combo ?? product?.type === 'combo'

/** A single item: neither tick. */
export const isSingleItem = (product: null | ProductKindSource | undefined): boolean =>
  !isMealPlan(product) && !hasComboItems(product)

/** The stored pricing kind for a pair of ticks. */
export const productTypeFor = (product: ProductKindSource): ProductTypeValue =>
  isMealPlan(product) ? 'plan' : hasComboItems(product) ? 'combo' : 'one-time'
