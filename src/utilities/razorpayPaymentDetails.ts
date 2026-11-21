/**
 * What an order keeps of Razorpay's payment record, and nothing more.
 *
 * The record comes from the gateway: the payments API on the browser return,
 * or the webhook's `payload.payment.entity`
 * (https://razorpay.com/docs/webhooks/payloads/payments/). Only well-formed
 * values are kept, and a value Razorpay did not send stays absent, so the
 * admin shows only what was really received. Of a card, only the network, the
 * type and the last four digits are kept; never the IIN or the cardholder name.
 */

export type OrderPaymentDetails = {
  method?: string
  vpa?: string
  cardNetwork?: string
  cardType?: string
  cardLast4?: string
  bank?: string
  wallet?: string
  /** The bank's reference: the RRN, else the UPI transaction id. */
  bankReference?: string
  /** Razorpay's fee and the GST on it, in paise. */
  fee?: number
  tax?: number
  /** What the payer typed in the Razorpay popup. */
  email?: string
  contact?: string
  capturedAt?: string
}

const MAX = 200

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const text = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, MAX) : undefined
}

const paise = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined

const unixTime = (value: unknown): string | undefined =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? new Date(value * 1000).toISOString() : undefined

export function paymentDetailsFrom(entity: unknown): OrderPaymentDetails {
  if (!isRecord(entity)) return {}

  const card = isRecord(entity.card) ? entity.card : {}
  const acquirer = isRecord(entity.acquirer_data) ? entity.acquirer_data : {}
  const last4 = text(card.last4)

  const details: OrderPaymentDetails = {
    method: text(entity.method),
    vpa: text(entity.vpa),
    cardNetwork: text(card.network),
    cardType: text(card.type),
    cardLast4: last4 && /^\d{4}$/.test(last4) ? last4 : undefined,
    bank: text(entity.bank),
    wallet: text(entity.wallet),
    bankReference: text(acquirer.rrn) ?? text(acquirer.upi_transaction_id) ?? text(acquirer.bank_transaction_id),
    fee: paise(entity.fee),
    tax: paise(entity.tax),
    email: text(entity.email),
    contact: text(entity.contact),
    capturedAt: unixTime(entity.created_at),
  }

  return Object.fromEntries(Object.entries(details).filter(([, value]) => value !== undefined)) as OrderPaymentDetails
}

const METHOD_LABELS: Record<string, string> = {
  card: 'Card',
  emi: 'EMI',
  netbanking: 'Netbanking',
  paylater: 'Pay later',
  upi: 'UPI',
  wallet: 'Wallet',
}

/** "UPI", "Card", "Pay later"; an unknown method reads as its own words. */
export function paymentMethodLabel(method: string): string {
  const known = METHOD_LABELS[method.toLowerCase()]
  if (known) return known
  const words = method.replace(/_/g, ' ').trim().toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
