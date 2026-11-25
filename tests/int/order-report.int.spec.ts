// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { reportLogos } from '@/utilities/orderReport/logos'

import { buildOrderReport, changeText, reportFileName, type ReportOrder } from '@/utilities/orderReport/build'
import { renderReportPdf } from '@/utilities/orderReport/pdf'
import { reportRange, shiftRange } from '@/utilities/orderReport/range'
import { renderReportXlsx } from '@/utilities/orderReport/xlsx'

/**
 * The weekly and monthly orders report. Periods are Indian calendar weeks
 * (Monday first) and months; every figure comes from the paid orders inside
 * the period, and the PDF and spreadsheet are built from the same numbers.
 */

const NOW = new Date('2026-11-25T10:00:00Z') // Wednesday, IST

describe('reportRange', () => {
  it('snaps a week to its Monday at midnight IST', () => {
    const range = reportRange('week', '2026-11-26')
    expect(range.key).toBe('2026-11-23')
    expect(range.from.toISOString()).toBe('2026-11-22T18:30:00.000Z')
    expect(range.to.toISOString()).toBe('2026-11-29T18:30:00.000Z')
    expect(range.days).toHaveLength(7)
    expect(range.label).toBe('23 – 29 Nov 2026')
  })

  it('labels a week that crosses a month', () => {
    expect(reportRange('week', '2026-12-01').label).toBe('30 Nov – 6 Dec 2026')
  })

  it('reads a calendar month in IST', () => {
    const range = reportRange('month', '2026-02')
    expect(range.from.toISOString()).toBe('2026-01-31T18:30:00.000Z')
    expect(range.days).toHaveLength(28)
    expect(range.label).toBe('February 2026')
  })

  it('falls back to the current period for a key that does not read', () => {
    expect(reportRange('week', 'nonsense', NOW).key).toBe('2026-11-23')
    expect(reportRange('month', '2026-13', NOW).key).toBe('2026-11')
  })

  it('steps to the period before and after', () => {
    expect(shiftRange(reportRange('week', '2026-11-23'), -1).key).toBe('2026-11-16')
    expect(shiftRange(reportRange('month', '2026-01'), -1).key).toBe('2025-12')
    expect(shiftRange(reportRange('month', '2026-12'), 1).key).toBe('2027-01')
  })
})

const orders: ReportOrder[] = [
  {
    customer: 1,
    delivery: { city: 'Chennai', name: 'Asha', phone: '9000000001' },
    gatewayPaymentId: 'pay_1',
    id: 11,
    items: [{ durationLabel: 'one-time', productTitle: 'Ragi mix', qty: 2, unitPrice: 25000 }],
    paidAt: '2026-11-23T03:00:00.000Z', // Monday 8:30 am IST
    payment: { fee: 1000, method: 'upi', tax: 180 },
    total: 50000,
  },
  {
    customer: 2,
    delivery: { city: 'Chennai', name: 'Ravi' },
    id: 12,
    items: [
      {
        addons: [{ title: 'Extra ghee' }],
        durationLabel: '30 days',
        productTitle: 'Toddler meal plan',
        qty: 1,
        unitPrice: 300000,
      },
      { durationLabel: 'one-time', productTitle: 'Ragi mix', qty: 1, unitPrice: 25000 },
    ],
    paidAt: '2026-11-29T18:00:00.000Z', // Sunday 11:30 pm IST, still this week
    payment: { method: 'card' },
    total: 325000,
  },
  {
    customer: 1,
    id: 13,
    items: [{ productTitle: 'Ragi mix', qty: 1, unitPrice: 25000 }],
    paidAt: '2026-11-29T19:00:00.000Z', // Monday 12:30 am IST, next week
    total: 25000,
  },
]

describe('buildOrderReport', () => {
  const report = buildOrderReport({
    generatedAt: NOW,
    orders,
    previous: { orders: 1, revenue: 250000 },
    range: reportRange('week', '2026-11-23'),
  })

  it('counts only the orders paid inside the period', () => {
    expect(report.totals).toEqual({
      average: 187500,
      customers: 2,
      fees: 1180,
      items: 4,
      net: 373820,
      orders: 2,
      revenue: 375000,
    })
  })

  it('puts each order on its IST day', () => {
    expect(report.days[0]).toMatchObject({ orders: 1, revenue: 50000 })
    expect(report.days[6]).toMatchObject({ orders: 1, revenue: 325000 })
    expect(report.days[0].label).toBe('Mon, 23 Nov')
  })

  it('groups products by title and duration, highest revenue first', () => {
    expect(report.products).toEqual([
      { duration: '30 days', orders: 1, qty: 1, revenue: 300000, title: 'Toddler meal plan' },
      { duration: 'One-time', orders: 2, qty: 3, revenue: 75000, title: 'Ragi mix' },
    ])
  })

  it('lists payment methods and order rows', () => {
    expect(report.methods.map((m) => m.method)).toEqual(['Card', 'UPI'])
    expect(report.rows.map((r) => r.id)).toEqual(['11', '12'])
    expect(report.rows[1].items).toBe('Toddler meal plan (30 days) + Extra ghee; Ragi mix (One-time)')
  })

  it('compares with the period before', () => {
    expect(changeText(report)).toBe('Up 50% on the week before (₹2,500)')
    expect(reportFileName(report)).toBe('unave-orders-week-2026-11-23')
  })

  it('renders a PDF and a spreadsheet with the logo', async () => {
    const logos = await reportLogos()
    expect(logos.pdf).not.toBeNull()
    expect(logos.xlsx).not.toBeNull()

    const pdf = await renderReportPdf(report, { logo: logos.pdf })
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe('%PDF-')

    const xlsx = await renderReportXlsx(report, { logo: logos.xlsx })
    expect(xlsx.subarray(0, 2).toString()).toBe('PK')
  })

  it('renders an empty period and names it can not draw', async () => {
    const empty = buildOrderReport({ orders: [], range: reportRange('month', '2026-01') })
    expect(empty.totals.orders).toBe(0)
    expect(changeText(empty)).toBeNull()

    const unicode = buildOrderReport({
      orders: [{ ...orders[0], delivery: { name: 'ஆஷா' } }],
      range: reportRange('week', '2026-11-23'),
    })
    await expect(renderReportPdf(unicode)).resolves.toBeInstanceOf(Uint8Array)
    await expect(renderReportPdf(empty)).resolves.toBeInstanceOf(Uint8Array)
  })
})
