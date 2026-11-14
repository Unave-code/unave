import { Link } from '@payloadcms/ui/elements/Link'
import type { WidgetServerProps } from 'payload'
import React from 'react'

import { formatPaise } from '@/utilities/money'

import { DayBars } from './DayBars'
import { dailySeries, istStartOfDay } from './series'
import './widgets.scss'

/** How many orders the kitchen took today, and what they came to. */
const OrdersToday = async ({ req }: WidgetServerProps) => {
  const [paidToday, perDay] = await Promise.all([
    req.payload.find({
      collection: 'orders',
      limit: 200,
      select: { total: true },
      where: { paidAt: { greater_than_equal: istStartOfDay().toISOString() } },
    }),
    dailySeries({ collection: 'orders', dateField: 'paidAt', payload: req.payload }),
  ])

  const collected = paidToday.docs.reduce((sum, order) => sum + (order.total ?? 0), 0)

  return (
    <div className="card unave-widget">
      <p className="unave-widget__eyebrow">Orders today</p>
      <p className="unave-widget__figure">{paidToday.totalDocs}</p>
      <p className="unave-widget__meta">{formatPaise(collected)} collected</p>
      <DayBars noun="Paid orders" points={perDay} />
      <Link className="unave-widget__link" href="/admin/collections/orders">
        Open orders
      </Link>
    </div>
  )
}

export default OrdersToday
