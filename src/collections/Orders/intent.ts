import type { Payload } from 'payload'

import type { CheckoutIntent } from '@/payload-types'
import { isValidCartQuantity } from '@/utilities/cart'

export type OrderIntentComponent = {
  days?: number
  durationLabel?: string
  product: number | null
  productTitle: string
}

export type OrderIntentItem = {
  components?: OrderIntentComponent[]
  days: number
  durationLabel: string
  product: number | null
  productTitle: string
  qty: number
  unitPrice: number
}

export type OrderIntent = {
  customerId: string
  delivery: {
    addressLine1: string
    addressLine2?: string
    city: string
    foodPreference: string
    name: string
    note?: string
    phone: string
    pincode: string
    state: string
  }
  id: number | string
  items: OrderIntentItem[]
  total: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const relationId = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (isRecord(value) && (typeof value.id === 'number' || typeof value.id === 'string')) {
    return value.id
  }
  return null
}

const numericId = (value: unknown): number | null => {
  const id = relationId(value)
  if (id === null) return null
  const number = typeof id === 'number' ? id : Number(id)
  return Number.isSafeInteger(number) && number > 0 ? number : null
}

// Payload reads an empty text field back as `null`, not `undefined`.
const optionalString = (value: unknown): value is null | string | undefined =>
  value === undefined || value === null || typeof value === 'string'

const optionalInteger = (value: unknown): value is null | number | undefined =>
  value === undefined || value === null || Number.isSafeInteger(value)

const readDelivery = (value: unknown): OrderIntent['delivery'] | null => {
  if (!isRecord(value)) return null
  const required = ['addressLine1', 'city', 'foodPreference', 'name', 'phone', 'pincode', 'state']

  if (required.some((key) => typeof value[key] !== 'string')) return null
  if (!optionalString(value.addressLine2) || !optionalString(value.note)) return null

  return {
    addressLine1: value.addressLine1 as string,
    addressLine2: typeof value.addressLine2 === 'string' ? value.addressLine2 : undefined,
    city: value.city as string,
    foodPreference: value.foodPreference as string,
    name: value.name as string,
    note: typeof value.note === 'string' ? value.note : undefined,
    phone: value.phone as string,
    pincode: value.pincode as string,
    state: value.state as string,
  }
}

const readComponents = (value: unknown): OrderIntentComponent[] | null => {
  if (!Array.isArray(value)) return null

  const components: OrderIntentComponent[] = []

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.productTitle !== 'string') return null
    const productId = numericId(entry.productId)
    const product = numericId(entry.productRef)
    if (productId === null) return null
    if (!optionalString(entry.durationLabel) || !optionalInteger(entry.days)) return null

    components.push({
      days: typeof entry.days === 'number' ? entry.days : undefined,
      durationLabel: typeof entry.durationLabel === 'string' ? entry.durationLabel : undefined,
      product,
      productTitle: entry.productTitle,
    })
  }

  return components.length > 0 && components.length <= 10 ? components : null
}

const readItems = (value: unknown): OrderIntentItem[] | null => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) return null
  const items: OrderIntentItem[] = []

  for (const entry of value) {
    if (!isRecord(entry)) return null
    const productId = numericId(entry.productId)
    const product = numericId(entry.productRef)
    // Payload reads an empty nested array back as `[]`, which means the item
    // has no combo contents, the same as leaving the field out.
    const rawComponents = entry.components
    const emptyComponents = Array.isArray(rawComponents) && rawComponents.length === 0
    const components =
      rawComponents === undefined || rawComponents === null || emptyComponents
        ? null
        : readComponents(rawComponents)

    if (
      productId === null ||
      typeof entry.productTitle !== 'string' ||
      typeof entry.durationLabel !== 'string' ||
      !Number.isSafeInteger(entry.days) ||
      !isValidCartQuantity(entry.qty) ||
      !Number.isSafeInteger(entry.unitPrice) ||
      (entry.unitPrice as number) < 1 ||
      (rawComponents !== undefined && rawComponents !== null && !emptyComponents && components === null)
    ) {
      return null
    }

    items.push({
      components: components ?? undefined,
      days: entry.days as number,
      durationLabel: entry.durationLabel,
      product,
      productTitle: entry.productTitle,
      qty: entry.qty as number,
      unitPrice: entry.unitPrice as number,
    })
  }

  return items
}

/**
 * The intent a stored record holds, or null when any part of it cannot be
 * trusted. The record is the only source a paid order is written from, so every
 * value is checked again here rather than believed because it came from our own
 * table: a tampered or half written row writes no order.
 */
export const readCheckoutIntent = (record: CheckoutIntent): OrderIntent | null => {
  const customerId = numericId(record.customer)
  const delivery = readDelivery(record.delivery)
  const items = readItems(record.items)
  const total = record.total

  if (
    customerId === null ||
    !delivery ||
    !items ||
    !Number.isSafeInteger(total) ||
    total < 1 ||
    items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0) !== total
  ) {
    return null
  }

  return { customerId: String(customerId), delivery, id: record.id, items, total }
}

export const findCheckoutIntent = async (
  payload: Payload,
  gatewayOrderId: string,
): Promise<OrderIntent | null> => {
  const found = await payload.find({
    collection: 'checkout-intents',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { gatewayOrderId: { equals: gatewayOrderId } },
  })

  const record = found.docs[0]
  return record ? readCheckoutIntent(record) : null
}

export const deleteCheckoutIntent = async (
  payload: Payload,
  intentId: number | string,
  gatewayOrderId: string,
): Promise<void> => {
  try {
    await payload.delete({
      collection: 'checkout-intents',
      id: intentId,
      overrideAccess: true,
    })
  } catch (error) {
    payload.logger.error({
      err: error instanceof Error ? error.message : String(error),
      gatewayOrderId,
      intentId,
      msg: 'checkout_intent_delete_failed',
    })
  }
}
