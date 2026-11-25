import { formatPaise } from '@/utilities/money'

import { istFormat, type ReportRange } from './range'

type Maybe<T> = T | null | undefined

/** The order fields the report reads; a full `Order` fits. */
export type ReportOrder = {
  id: number | string
  customer?: Maybe<number | string | { id?: number | string; email?: Maybe<string>; name?: Maybe<string> }>
  items?: Maybe<
    {
      productTitle?: Maybe<string>
      durationLabel?: Maybe<string>
      days?: Maybe<number>
      qty?: Maybe<number>
      unitPrice?: Maybe<number>
      basePrice?: Maybe<number>
      addons?: Maybe<{ title?: Maybe<string>; price?: Maybe<number> }[]>
      components?: Maybe<{ productTitle?: Maybe<string>; durationLabel?: Maybe<string> }[]>
    }[]
  >
  delivery?: Maybe<{
    name?: Maybe<string>
    phone?: Maybe<string>
    addressLine1?: Maybe<string>
    addressLine2?: Maybe<string>
    city?: Maybe<string>
    state?: Maybe<string>
    pincode?: Maybe<string>
    foodPreference?: Maybe<string>
    note?: Maybe<string>
  }>
  subtotal?: Maybe<number>
  total?: Maybe<number>
  paidAt?: Maybe<string>
  createdAt?: Maybe<string>
  startsOn?: Maybe<string>
  gatewayOrderId?: Maybe<string>
  gatewayPaymentId?: Maybe<string>
  payment?: Maybe<{
    method?: Maybe<string>
    vpa?: Maybe<string>
    cardNetwork?: Maybe<string>
    cardType?: Maybe<string>
    cardLast4?: Maybe<string>
    bank?: Maybe<string>
    wallet?: Maybe<string>
    bankReference?: Maybe<string>
    fee?: Maybe<number>
    tax?: Maybe<number>
    email?: Maybe<string>
    contact?: Maybe<string>
    capturedAt?: Maybe<string>
  }>
}

/** The customer account behind an order, when the loader could read it. */
export type ReportCustomer = { email?: Maybe<string>; name?: Maybe<string> }

export type ReportTotals = {
  orders: number
  /** Paise collected. */
  revenue: number
  /** Paise per order, rounded. */
  average: number
  items: number
  customers: number
  /** Razorpay fee plus GST on it, paise, where Razorpay reported one. */
  fees: number
  /** Revenue less fees. */
  net: number
}

/** One paid order with everything the order row holds, flattened for a table. */
export type ReportRow = {
  id: string
  paidAt: Date
  createdAt: Date | null
  startsOn: Date | null
  customer: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  pincode: string
  /** The whole delivery address on one line. */
  address: string
  foodPreference: string
  note: string
  items: string
  qty: number
  subtotal: number
  total: number
  method: string
  /** "UPI · name@okaxis", "Visa credit •••• 4242", the bank or the wallet. */
  paymentDetail: string
  bankReference: string
  fee: number
  tax: number
  payerEmail: string
  payerPhone: string
  capturedAt: Date | null
  gatewayOrderId: string
  paymentId: string
}

/** One product line of one order. */
export type ReportLine = {
  orderId: string
  paidAt: Date
  customer: string
  product: string
  duration: string
  days: number | null
  qty: number
  /** The product's own price per item, paise; empty on orders from before add-ons. */
  basePrice: number | null
  addons: string
  /** Per item, paise. */
  addonsPrice: number
  /** Product plus add-ons per item, paise. */
  unitPrice: number
  lineTotal: number
  /** The contents of a combo. */
  contents: string
}

export type OrderReport = {
  range: ReportRange
  generatedAt: Date
  totals: ReportTotals
  /** The period before, for the "up / down" comparison. */
  previous: { orders: number; revenue: number } | null
  days: { date: Date; label: string; orders: number; revenue: number }[]
  products: { title: string; duration: string; qty: number; orders: number; revenue: number }[]
  methods: { method: string; orders: number; revenue: number }[]
  rows: ReportRow[]
  lines: ReportLine[]
}

const METHOD_LABELS: Record<string, string> = {
  card: 'Card',
  emi: 'EMI',
  netbanking: 'Net banking',
  paylater: 'Pay later',
  upi: 'UPI',
  wallet: 'Wallet',
}

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export const paymentMethodLabel = (method?: Maybe<string>): string => {
  if (!method) return 'Not recorded'
  return METHOD_LABELS[method.toLowerCase()] ?? capitalise(method)
}

export const durationText = (label?: Maybe<string>): string => {
  if (!label) return ''
  if (label === 'one-time') return 'One-time'
  return label
}

const FOOD: Record<string, string> = {
  eggetarian: 'Eggetarian',
  'non-vegetarian': 'Non-vegetarian',
  none: 'No preference',
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
}

const foodText = (value?: Maybe<string>) => (value ? (FOOD[value] ?? capitalise(value)) : '')

/** How the customer paid, in the words a receipt would use. */
export const paymentDetailText = (payment: ReportOrder['payment']): string => {
  if (!payment) return ''
  const method = payment.method?.toLowerCase()
  if (method === 'upi') return payment.vpa ? `UPI · ${payment.vpa}` : 'UPI'
  if (method === 'card' || method === 'emi') {
    const parts = [payment.cardNetwork, payment.cardType].filter(Boolean).join(' ')
    const last4 = payment.cardLast4 ? `•••• ${payment.cardLast4}` : ''
    return [parts || paymentMethodLabel(method), last4].filter(Boolean).join(' ')
  }
  if (method === 'netbanking') return payment.bank ? `Net banking · ${payment.bank}` : 'Net banking'
  if (method === 'wallet') return payment.wallet ? `Wallet · ${capitalise(payment.wallet)}` : 'Wallet'
  return payment.method ? paymentMethodLabel(payment.method) : ''
}

const customerId = (customer: ReportOrder['customer']): string | null => {
  if (customer === null || customer === undefined) return null
  if (typeof customer === 'object') return customer.id === undefined ? null : String(customer.id)
  return String(customer)
}

const toDate = (value?: Maybe<string>): Date | null => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const clean = (value?: Maybe<string>) => value?.trim() ?? ''

/**
 * Turns the paid orders of one period into the figures the report shows and
 * downloads. Pure, so the admin view, the PDF and the spreadsheet all read the
 * same numbers. Orders outside the range are ignored.
 */
export const buildOrderReport = ({
  customers: accounts = {},
  generatedAt = new Date(),
  orders,
  previous = null,
  range,
}: {
  orders: ReportOrder[]
  range: ReportRange
  previous?: { orders: number; revenue: number } | null
  /** Customer accounts by id, for the email address. */
  customers?: Record<string, ReportCustomer>
  generatedAt?: Date
}): OrderReport => {
  const days = range.days.map((date) => ({
    date,
    label: istFormat(date, { day: 'numeric', month: 'short', weekday: 'short' }),
    orders: 0,
    revenue: 0,
  }))
  const products = new Map<string, OrderReport['products'][number]>()
  const methods = new Map<string, OrderReport['methods'][number]>()
  const customers = new Set<string>()
  const rows: ReportRow[] = []
  const lines: ReportLine[] = []

  let revenue = 0
  let items = 0
  let fees = 0

  for (const order of orders) {
    const at = toDate(order.paidAt) ?? toDate(order.createdAt)
    if (!at || at < range.from || at >= range.to) continue

    const total = order.total ?? 0
    revenue += total

    const day = days[Math.floor((at.getTime() - range.from.getTime()) / (24 * 60 * 60 * 1000))]
    if (day) {
      day.orders += 1
      day.revenue += total
    }

    const who = customerId(order.customer)
    if (who) customers.add(who)
    const account: ReportCustomer =
      (who ? accounts[who] : undefined) ??
      (order.customer && typeof order.customer === 'object' ? order.customer : {})

    const fee = order.payment?.fee ?? 0
    const tax = order.payment?.tax ?? 0
    fees += fee + tax

    const method = paymentMethodLabel(order.payment?.method)
    const methodRow = methods.get(method) ?? { method, orders: 0, revenue: 0 }
    methodRow.orders += 1
    methodRow.revenue += total
    methods.set(method, methodRow)

    const delivery = order.delivery ?? {}
    const customerName = clean(delivery.name) || clean(account.name)

    let orderQty = 0
    const lineText: string[] = []

    for (const line of order.items ?? []) {
      const qty = line.qty ?? 1
      const title = clean(line.productTitle) || 'Untitled product'
      const duration = durationText(line.durationLabel)
      const unitPrice = line.unitPrice ?? 0
      const key = JSON.stringify([title, duration])
      const product = products.get(key) ?? { duration, orders: 0, qty: 0, revenue: 0, title }
      product.qty += qty
      product.orders += 1
      product.revenue += unitPrice * qty
      products.set(key, product)

      const addons = (line.addons ?? []).filter((addon) => clean(addon.title))
      const contents = (line.components ?? [])
        .map((part) => clean(part.productTitle))
        .filter(Boolean)
        .join(', ')

      lines.push({
        addons: addons.map((addon) => clean(addon.title)).join(', '),
        addonsPrice: addons.reduce((sum, addon) => sum + (addon.price ?? 0), 0),
        basePrice: line.basePrice ?? null,
        contents,
        customer: customerName,
        days: line.days ?? null,
        duration,
        lineTotal: unitPrice * qty,
        orderId: String(order.id),
        paidAt: at,
        product: title,
        qty,
        unitPrice,
      })

      orderQty += qty
      lineText.push(
        `${qty > 1 ? `${qty} x ` : ''}${title}${duration ? ` (${duration})` : ''}${
          addons.length ? ` + ${addons.map((addon) => clean(addon.title)).join(', ')}` : ''
        }`,
      )
    }

    items += orderQty

    const addressLine1 = clean(delivery.addressLine1)
    const addressLine2 = clean(delivery.addressLine2)
    const city = clean(delivery.city)
    const state = clean(delivery.state)
    const pincode = clean(delivery.pincode)
    const place = [city, [state, pincode].filter(Boolean).join(' ')].filter(Boolean).join(', ')

    rows.push({
      address: [addressLine1, addressLine2, place].filter(Boolean).join(', '),
      addressLine1,
      addressLine2,
      bankReference: clean(order.payment?.bankReference),
      capturedAt: toDate(order.payment?.capturedAt),
      city,
      createdAt: toDate(order.createdAt),
      customer: customerName,
      email: clean(account.email) || clean(order.payment?.email),
      fee,
      foodPreference: foodText(delivery.foodPreference),
      gatewayOrderId: clean(order.gatewayOrderId),
      id: String(order.id),
      items: lineText.join('; '),
      method,
      note: clean(delivery.note),
      paidAt: at,
      payerEmail: clean(order.payment?.email),
      payerPhone: clean(order.payment?.contact),
      paymentDetail: paymentDetailText(order.payment),
      paymentId: clean(order.gatewayPaymentId),
      phone: clean(delivery.phone),
      pincode,
      qty: orderQty,
      startsOn: toDate(order.startsOn),
      state,
      subtotal: order.subtotal ?? total,
      tax,
      total,
    })
  }

  rows.sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime())
  lines.sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime())

  const count = rows.length

  return {
    days,
    generatedAt,
    lines,
    methods: [...methods.values()].sort((a, b) => b.revenue - a.revenue),
    previous,
    products: [...products.values()].sort((a, b) => b.revenue - a.revenue || b.qty - a.qty),
    range,
    rows,
    totals: {
      average: count ? Math.round(revenue / count) : 0,
      customers: customers.size,
      fees,
      items,
      net: revenue - fees,
      orders: count,
      revenue,
    },
  }
}

/** "Up 12% on the week before", or null when there is nothing to compare. */
export const changeText = (report: OrderReport): string | null => {
  if (!report.previous) return null
  const before = report.previous.revenue
  const noun = report.range.period === 'week' ? 'week' : 'month'
  if (before <= 0) return `No sales the ${noun} before`
  const now = report.totals.revenue
  const pct = Math.abs(Math.round(((now - before) / before) * 100))
  if (pct === 0) return `Level with the ${noun} before`
  return `${now > before ? 'Up' : 'Down'} ${pct}% on the ${noun} before (${formatPaise(before)})`
}

/** "unave-orders-week-2026-11-23" — the download's file name, without extension. */
export const reportFileName = (report: OrderReport): string =>
  `unave-orders-${report.range.period}-${report.range.key}`
