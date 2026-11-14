import { Link } from '@payloadcms/ui/elements/Link'
import type { WidgetServerProps } from 'payload'
import React from 'react'

import { formatPaise } from '@/utilities/money'

import { DayBars } from './DayBars'
import { dailySeries } from './series'
import './widgets.scss'

const DAYS = 14

/**
 * Money collected per day over the last two weeks, with the fortnight's total
 * as the headline and a comparison against the fortnight before it.
 */
const SalesTrend = async ({ req }: WidgetServerProps) => {
  const series = await dailySeries<{ total?: number | null }>({
    collection: 'orders',
    dateField: 'paidAt',
    days: DAYS * 2,
    payload: req.payload,
    amount: (order) => order.total ?? 0,
  })

  const previous = series.slice(0, DAYS)
  const current = series.slice(DAYS)
  const sum = (points: typeof series) => points.reduce((total, p) => total + p.value, 0)
  const now = sum(current)
  const before = sum(previous)

  const change =
    before > 0
      ? `${now >= before ? 'Up' : 'Down'} ${Math.abs(Math.round(((now - before) / before) * 100))}% on the 14 days before`
      : 'No sales in the 14 days before'

  return (
    <div className="card unave-widget">
      <p className="unave-widget__eyebrow">Sales, last 14 days</p>
      <p className="unave-widget__figure">{formatPaise(now)}</p>
      <p className="unave-widget__meta">{change}</p>
      <DayBars format={formatPaise} height={96} noun="Sales" points={current} showDates />
      <Link className="unave-widget__link" href="/admin/collections/orders?sort=-paidAt">
        Open orders
      </Link>
    </div>
  )
}

export default SalesTrend
