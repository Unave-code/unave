import type { Endpoint, PayloadRequest } from 'payload'

import { hasStaffRole } from '@/access/isStaff'
import {
  buildOrderReport,
  reportFileName,
  type OrderReport,
  type ReportCustomer,
  type ReportOrder,
} from '@/utilities/orderReport/build'
import {
  isReportPeriod,
  reportRange,
  shiftRange,
  type ReportPeriod,
  type ReportRange,
} from '@/utilities/orderReport/range'

/** True only for a signed in staff user, never a customer session. */
export const isStaffRequest = (req: PayloadRequest): boolean =>
  Boolean(req.user) && req.user?.collection === 'users' && hasStaffRole(req.user)

const paidIn = (range: ReportRange) => ({
  and: [
    { paidAt: { greater_than_equal: range.from.toISOString() } },
    { paidAt: { less_than: range.to.toISOString() } },
  ],
})

/**
 * Reads the paid orders of one week or month, plus the period before for the
 * comparison line, and builds the report. Runs with the caller's access, so it
 * only ever sees what the signed in staff user may read.
 */
export const loadOrderReport = async (
  req: PayloadRequest,
  period: ReportPeriod,
  key?: string | null,
): Promise<OrderReport> => {
  const range = reportRange(period, key)
  const before = shiftRange(range, -1)

  const [current, previous, owed] = await Promise.all([
    req.payload.find({
      collection: 'orders',
      depth: 0,
      overrideAccess: false,
      pagination: false,
      req,
      sort: 'paidAt',
      where: paidIn(range),
    }),
    req.payload.find({
      collection: 'orders',
      depth: 0,
      overrideAccess: false,
      pagination: false,
      req,
      select: { total: true },
      where: paidIn(before),
    }),
    // Cash on delivery placed in the period and still owed: shown apart, never revenue.
    req.payload.find({
      collection: 'orders',
      depth: 0,
      overrideAccess: false,
      pagination: false,
      req,
      select: { paymentState: true, paymentType: true, total: true },
      where: {
        and: [
          { paymentState: { equals: 'cashDue' } },
          { createdAt: { greater_than_equal: range.from.toISOString() } },
          { createdAt: { less_than: range.to.toISOString() } },
        ],
      },
    }),
  ])

  const orders = current.docs as unknown as ReportOrder[]
  const ids = [
    ...new Set(
      orders
        .map((order) => (typeof order.customer === 'object' ? order.customer?.id : order.customer))
        .filter((id): id is number | string => id !== null && id !== undefined),
    ),
  ]

  // The account email; a failed read only leaves the column to the payer email.
  const customers: Record<string, ReportCustomer> = {}
  if (ids.length) {
    try {
      const accounts = await req.payload.find({
        collection: 'customers',
        depth: 0,
        overrideAccess: false,
        pagination: false,
        req,
        select: { email: true, name: true },
        where: { id: { in: ids } },
      })
      for (const account of accounts.docs) customers[String(account.id)] = account
    } catch (error) {
      req.payload.logger.warn({ err: error, msg: 'Order report could not read customer accounts' })
    }
  }

  return buildOrderReport({
    cashDue: owed.docs as unknown as ReportOrder[],
    customers,
    orders,
    previous: {
      orders: previous.docs.length,
      revenue: previous.docs.reduce((sum, order) => sum + (order.total ?? 0), 0),
    },
    range,
  })
}

/**
 * GET /api/orders/report?period=week|month&key=2026-11-23|2026-11&format=pdf|xlsx
 *
 * Staff only. The renderers are imported on demand so the PDF and spreadsheet
 * libraries load only when somebody downloads a report.
 */
export const orderReportEndpoint: Endpoint = {
  method: 'get',
  path: '/report',
  handler: async (req) => {
    if (!isStaffRequest(req)) {
      return Response.json({ error: 'Only staff can download reports.' }, { status: 403 })
    }

    const url = new URL(req.url ?? '', 'http://localhost')
    const periodParam = url.searchParams.get('period')
    const format = url.searchParams.get('format')
    const period: ReportPeriod = isReportPeriod(periodParam) ? periodParam : 'week'

    if (format !== 'pdf' && format !== 'xlsx') {
      return Response.json({ error: 'Ask for format=pdf or format=xlsx.' }, { status: 400 })
    }

    const [report, logos] = await Promise.all([
      loadOrderReport(req, period, url.searchParams.get('key')),
      import('@/utilities/orderReport/logos').then((m) => m.reportLogos()),
    ])
    const name = reportFileName(report)

    const headers = (type: string, ext: string) => ({
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${name}.${ext}"`,
      'Content-Type': type,
    })

    if (format === 'pdf') {
      const { renderReportPdf } = await import('@/utilities/orderReport/pdf')
      const bytes = await renderReportPdf(report, { logo: logos.pdf })
      return new Response(Buffer.from(bytes), { headers: headers('application/pdf', 'pdf') })
    }

    const { renderReportXlsx } = await import('@/utilities/orderReport/xlsx')
    const bytes = await renderReportXlsx(report, { logo: logos.xlsx })
    return new Response(new Uint8Array(bytes), {
      headers: headers('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'),
    })
  },
}
