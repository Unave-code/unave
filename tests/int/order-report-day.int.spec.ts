// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { buildOrderReport, changeText, reportFileName } from '@/utilities/orderReport/build'
import { renderReportPdf } from '@/utilities/orderReport/pdf'
import { periodAdjective, reportRange, shiftRange } from '@/utilities/orderReport/range'
import { renderReportXlsx } from '@/utilities/orderReport/xlsx'

/**
 * The day report: one Indian calendar day, broken down by hour, alongside the
 * weekly and monthly reports.
 */
describe('day report', () => {
  const range = reportRange('day', '2026-11-25')

  it('covers one IST day in 24 hourly slots', () => {
    expect(range.from.toISOString()).toBe('2026-11-24T18:30:00.000Z')
    expect(range.to.toISOString()).toBe('2026-11-25T18:30:00.000Z')
    expect(range.days).toHaveLength(24)
    expect(range.key).toBe('2026-11-25')
    expect(range.label).toBe('Wed, 25 Nov 2026')
    expect(periodAdjective('day')).toBe('Daily')
  })

  it('steps a day at a time, across a month end', () => {
    expect(shiftRange(reportRange('day', '2026-11-30'), 1).key).toBe('2026-12-01')
    expect(shiftRange(reportRange('day', '2026-03-01'), -1).key).toBe('2026-02-28')
  })

  it('puts each order in its IST hour', () => {
    const report = buildOrderReport({
      orders: [
        { id: 1, paidAt: '2026-11-25T03:45:00.000Z', total: 10000 }, // 9:15 am IST
        { id: 2, paidAt: '2026-11-25T04:20:00.000Z', total: 20000 }, // 9:50 am IST
        { id: 3, paidAt: '2026-11-25T18:29:00.000Z', total: 5000 }, // 11:59 pm IST
        { id: 4, paidAt: '2026-11-25T18:31:00.000Z', total: 99999 }, // next day
      ],
      previous: { orders: 1, revenue: 35000 },
      range,
    })

    expect(report.totals.orders).toBe(3)
    expect(report.days[9]).toMatchObject({ orders: 2, revenue: 30000 })
    expect(report.days[9].label).toBe('9 am')
    expect(report.days[23]).toMatchObject({ orders: 1, revenue: 5000 })
    expect(changeText(report)).toBe('Level with the day before')
    expect(reportFileName(report)).toBe('unave-orders-day-2026-11-25')
  })

  it('renders both downloads', async () => {
    const report = buildOrderReport({ orders: [{ id: 1, paidAt: '2026-11-25T03:45:00.000Z', total: 10000 }], range })
    const pdf = await renderReportPdf(report)
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe('%PDF-')
    const xlsx = await renderReportXlsx(report)
    expect(xlsx.subarray(0, 2).toString()).toBe('PK')
  })
})
