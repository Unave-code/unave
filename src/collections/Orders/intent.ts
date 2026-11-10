import type { Order } from '@/payload-types'

/**
 * The checkout intent, carried on the Razorpay order (spec 0007).
 *
 * No order row is written at checkout: a row is born only once a payment is
 * captured, so an abandoned checkout leaves nothing behind. That means
 * everything needed to write the row has to survive the wait between opening
 * the gateway order and the payment landing, including the case where the
 * browser never comes back and only the signed webhook arrives.
 *
 * The gateway order's own notes are that store. They survive a closed tab, and
 * they are the record the webhook reads. Razorpay caps notes at 15 pairs of 256
 * characters each (verified against the Orders API docs during this build), so
 * the basket travels as compact indexed packs (`l0` to `l4`, two lines each) and
 * the delivery stays as flat capped values. Ten lines plus eight delivery values
 * is thirteen pairs, one under the cap, and every value stays inside 240
 * characters, under the gateway's 256.
 */

const NOTE_MAX = 240
const TITLE_MAX = 40
const DURATION_MAX = 40
/** Two lines per note key keeps every value well under the limit. */
const LINES_PER_NOTE = 2
const MAX_NOTES = 5

const cap = (value: null | string | undefined, max = NOTE_MAX): string =>
  (value ?? '').trim().slice(0, max)

export type OrderIntentItem = {
  days: number
  durationLabel: string
  productId: number | string
  productTitle: string
  unitPrice: number
  /**
   * How many of the product the line holds. A meal plan line is always one —
   * the plan is the line — so the field stays optional and anything absent
   * reads as one, on the wire and off it.
   */
  qty?: number
}

export type OrderIntent = {
  customerId: string
  delivery: {
    addressLine1?: string
    addressLine2?: string
    city?: string
    foodPreference?: string
    name?: string
    note?: string
    phone?: string
    pincode?: string
    state?: string
  }
  items: Order['items']
  total: number
}

/**
 * One line as the gateway stores it: [product id, duration, days, price, title,
 * quantity]. The sixth element is what quantities added to the store; older
 * intents written as five element lines still read, as quantity one.
 */
type PackedLine = [number | string, string, number, number, string, number]

const qtyOf = (item: OrderIntentItem): number =>
  typeof item.qty === 'number' && Number.isInteger(item.qty) && item.qty >= 1 ? item.qty : 1

export const buildOrderNotes = (input: {
  customerId: number | string
  delivery: {
    city?: string
    line1?: string
    line2?: string
    name?: string
    phone?: string
    pincode?: string
    state?: string
  }
  items: OrderIntentItem[]
  note?: string
}): Record<string, string> => {
  const notes: Record<string, string> = {
    c: cap(String(input.customerId), 40),
    d_addr1: cap(input.delivery.line1),
    d_addr2: cap(input.delivery.line2),
    d_city: cap(input.delivery.city),
    d_name: cap(input.delivery.name),
    d_note: cap(input.note),
    d_phone: cap(input.delivery.phone),
    d_pin: cap(input.delivery.pincode),
    d_state: cap(input.delivery.state),
  }

  const packs = new Map<number, PackedLine[]>()

  input.items.slice(0, MAX_NOTES * LINES_PER_NOTE).forEach((item, index) => {
    const pack = Math.floor(index / LINES_PER_NOTE)
    const line: PackedLine = [
      item.productId,
      cap(item.durationLabel, DURATION_MAX),
      item.days,
      item.unitPrice,
      cap(item.productTitle, TITLE_MAX),
      qtyOf(item),
    ]

    const existing = packs.get(pack)

    if (existing) existing.push(line)
    else packs.set(pack, [line])
  })

  for (const [pack, lines] of packs) notes[`l${pack}`] = JSON.stringify(lines)

  return notes
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

const readPackedLine = (raw: unknown): null | OrderIntentItem => {
  if (!Array.isArray(raw) || (raw.length !== 5 && raw.length !== 6)) return null

  const [productId, durationLabel, days, unitPrice, productTitle, packedQty] = raw

  if (
    (typeof productId !== 'number' && typeof productId !== 'string') ||
    typeof durationLabel !== 'string' ||
    typeof days !== 'number' ||
    typeof unitPrice !== 'number' ||
    typeof productTitle !== 'string'
  ) {
    return null
  }

  const product = typeof productId === 'number' ? productId : Number(productId)

  if (!Number.isFinite(product)) return null

  // A five element line predates quantities and reads as one. A six element
  // line must carry a sane whole number, or the intent is not the one the
  // checkout wrote — refusing the whole pack is the honest answer.
  let qty = 1

  if (raw.length === 6) {
    if (typeof packedQty !== 'number' || !Number.isInteger(packedQty) || packedQty < 1) {
      return null
    }

    qty = packedQty
  }

  return {
    days,
    durationLabel,
    productId: product,
    productTitle,
    qty,
    unitPrice,
  }
}

const readLinePacks = (values: Record<string, unknown>): null | OrderIntentItem[] => {
  const items: OrderIntentItem[] = []

  for (let index = 0; index < MAX_NOTES; index += 1) {
    const raw = values[`l${index}`]

    if (raw === undefined) continue
    if (typeof raw !== 'string') return null

    let parsed: unknown

    try {
      parsed = JSON.parse(raw)
    } catch {
      return null
    }

    if (!Array.isArray(parsed)) return null

    for (const entry of parsed) {
      const line = readPackedLine(entry)

      if (!line) return null

      items.push(line)
    }
  }

  return items.length > 0 ? items : null
}

/**
 * Turn what the gateway hands back into the order to write. Returns null when
 * the notes are missing or unreadable, which is the honest answer: the caller
 * then writes nothing rather than inventing a row.
 */
export const readOrderNotes = (notes: unknown): OrderIntent | null => {
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) return null

  const values = notes as Record<string, unknown>
  const packed = readLinePacks(values)

  if (!packed) return null

  const customerId = text(values.c)

  if (!customerId) return null

  const note = text(values.d_note)
  const items = packed.map((line) => ({
    days: line.days,
    durationLabel: line.durationLabel,
    product: line.productId as number,
    productTitle: line.productTitle,
    qty: line.qty ?? 1,
    unitPrice: line.unitPrice,
  }))

  return {
    customerId,
    delivery: {
      addressLine1: text(values.d_addr1) || undefined,
      addressLine2: text(values.d_addr2) || undefined,
      city: text(values.d_city) || undefined,
      foodPreference: text(values.d_food) || undefined,
      name: text(values.d_name) || undefined,
      note: note || undefined,
      phone: text(values.d_phone) || undefined,
      pincode: text(values.d_pin) || undefined,
      state: text(values.d_state) || undefined,
    },
    items,
    total: items.reduce((sum, line) => sum + line.unitPrice * (line.qty ?? 1), 0),
  }
}
