import { ONE_TIME_DURATION } from '@/utilities/cart'
import { PRODUCT_ONE_TIME_LABEL } from '@/utilities/productsCopy'

export type OrderComponentDisplay = {
  days?: null | number
  durationLabel?: null | string
  productTitle?: null | string
}

export const orderComponentsLabel = (
  components?: null | OrderComponentDisplay[],
): string | null => {
  if (!components?.length) return null

  return components
    .map((component) => {
      const duration = component.durationLabel?.trim()
      const days = Number(component.days)
      const detail = duration
        ? `${duration}${Number.isInteger(days) && days > 0 ? `, ${days} ${days === 1 ? 'day' : 'days'}` : ''}`
        : ''

      const title = component.productTitle?.trim() || 'Product'
      return detail ? `${title} (${detail})` : title
    })
    .join(', ')
}

/**
 * Whether an order item was a one-time purchase: the reserved one-time label,
 * or a size of a product sold in sizes (a label with no days and no combo).
 * A meal plan always carries one day or more.
 */
export const isOneTimeOrderItem = (item: {
  components?: null | OrderComponentDisplay[]
  days?: null | number
  durationLabel?: null | string
}): boolean =>
  !item.components?.length &&
  (item.durationLabel === ONE_TIME_DURATION || !(Number(item.days) > 0))

export const orderItemKind = (item: {
  components?: null | OrderComponentDisplay[]
  days?: null | number
  durationLabel?: null | string
}): string => {
  if (item.components?.length) return 'Meal combo'
  if (item.durationLabel === ONE_TIME_DURATION) return PRODUCT_ONE_TIME_LABEL
  if (isOneTimeOrderItem(item) && item.durationLabel?.trim()) {
    return `${PRODUCT_ONE_TIME_LABEL} · ${item.durationLabel.trim()}`
  }
  return item.durationLabel ?? ''
}
