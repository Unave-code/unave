import { formatPaise } from '@/utilities/money'

import { istFormat, type ReportRange } from './range'

/** The order fields the report reads; a full `Order` fits. */
export type ReportOrder = {
  id: number | string
  customer?: number | string | { id?: number | string } | null
  items?:
    | {
        productTitle?: string | null
        durationLabel?: string | null
        qty?: number | null
        unitPrice?: number | null
        addons?: { title?: string | null }[] | null
      }[]
    | null
  delivery?: {
    name?: string | null
    phone?: string | null
    city?: string | null
    pincode?: string | null
  } | null
  total?: number | null
  paidAt?: string | null
  createdAt?: string | null
  gatewayPaymentId?: string | null
  payment?: { method?: string | null; fee?: number | null; tax?: number | null } | null
}

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

export type OrderReport = {
  range: ReportRange
  generatedAt: Date
  totals: ReportTotals
  /** The period before, for the "up / down" comparison. */
  previous: { orders: number; revenue: number } | null
  days: { date: Date; label: string; orders: number; revenue: number }[]
  products: { title: string; duration: string; qty: number; orders: number; revenue: number }[]
  methods: { method: string; orders: number; revenue: number }[]
  rows: {
    id: string
    paidAt: Date
    customer: string
    phone: string
    city: string
    items: string
    qty: number
    total: number
    method: string
    paymentId: string
  }[]
}

const METHOD_LABELS: Record<string, string> = {
  card: 'Card',
  emi: 'EMI',
  netbanking: 'Net banking',
  paylater: 'Pay later',
  upi: 'UPI',
  wallet: 'Wallet',
}

export const paymentMethodLabel = (method?: string | null): string => {
  if (!method) return 'Not recorded'
  return METHOD_LABELS[method.toLowerCase()] ?? method.charAt(0).toUpperCase() + method.slice(1)
}

export const durationText = (label?: string | null): string => {
  if (!label) return ''
  if (label === 'one-time') return 'One-time'
  return label
}

const customerId = (customer: ReportOrder['customer']): string | null => {
  if (customer === null || customer === undefined) return null
  if (typeof customer === 'object') return customer.id === undefined ? null : String(customer.id)
  return String(customer)
}

const orderTime = (order: ReportOrder): Date | null => {
  const at = order.paidAt ?? order.createdAt
  if (!at) return null
  const date = new Date(at)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Turns the paid orders of one period into the figures the report shows and
 * downloads. Pure, so the admin view, the PDF and the spreadsheet all read the
 * same numbers. Orders outside the range are ignored.
 */
export const buildOrderReport = ({
  generatedAt = new Date(),
  orders,
  previous = null,
  range,
}: {
  orders: ReportOrder[]
  range: ReportRange
  previous?: { orders: number; revenue: number } | null
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
  const rows: OrderReport['rows'] = []

  let revenue = 0
  let items = 0
  let fees = 0

  for (const order of orders) {
    const at = orderTime(order)
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

    fees += (order.payment?.fee ?? 0) + (order.payment?.tax ?? 0)

    const method = paymentMethodLabel(order.payment?.method)
    const methodRow = methods.get(method) ?? { method, orders: 0, revenue: 0 }
    methodRow.orders += 1
    methodRow.revenue += total
    methods.set(method, methodRow)

    let orderQty = 0
    const lineText: string[] = []

    for (const line of order.items ?? []) {
      const qty = line.qty ?? 1
      const title = line.productTitle?.trim() || 'Untitled product'
      const duration = durationText(line.durationLabel)
      const key = JSON.stringify([title, duration])
      const product = products.get(key) ?? { duration, orders: 0, qty: 0, revenue: 0, title }
      product.qty += qty
      product.orders += 1
      product.revenue += (line.unitPrice ?? 0) * qty
      products.set(key, product)

      orderQty += qty
      const addons = (line.addons ?? []).map((addon) => addon.title).filter(Boolean)
      lineText.push(
        `${qty > 1 ? `${qty} x ` : ''}${title}${duration ? ` (${duration})` : ''}${
          addons.length ? ` + ${addons.join(', ')}` : ''
        }`,
      )
    }

    items += orderQty

    rows.push({
      city: order.delivery?.city?.trim() ?? '',
      customer: order.delivery?.name?.trim() ?? '',
      id: String(order.id),
      items: lineText.join('; '),
      method,
      paidAt: at,
      paymentId: order.gatewayPaymentId ?? '',
      phone: order.delivery?.phone?.trim() ?? '',
      qty: orderQty,
      total,
    })
  }

  rows.sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime())

  const count = rows.length

  return {
    days,
    generatedAt,
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
