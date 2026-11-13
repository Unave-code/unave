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

export const orderItemKind = (item: {
  components?: null | OrderComponentDisplay[]
  durationLabel?: null | string
}): string =>
  item.components?.length
    ? 'Meal combo'
    : item.durationLabel === ONE_TIME_DURATION
      ? PRODUCT_ONE_TIME_LABEL
      : (item.durationLabel ?? '')
