import { Link } from '@payloadcms/ui/elements/Link'
import type { WidgetServerProps } from 'payload'
import React from 'react'

import { formatPaise } from '@/utilities/money'

import { DayBars } from './DayBars'
import { loadOrdersToday } from './loadOrdersToday'
import { dailySeries } from './series'
import './widgets.scss'

/**
 * How many orders the kitchen took today, what came in, and the cash still
 * owed on cash on delivery orders.
 */
const OrdersToday = async ({ req }: WidgetServerProps) => {
  const [today, perDay] = await Promise.all([
    loadOrdersToday(req.payload),
    dailySeries({ collection: 'orders', dateField: 'paidAt', payload: req.payload }),
  ])

  return (
    <div className="card unave-widget">
      <p className="unave-widget__eyebrow">Orders today</p>
      <p className="unave-widget__figure">{today.placed}</p>
      <p className="unave-widget__meta">{formatPaise(today.collected)} collected</p>
      {today.cashDue.count > 0 ? (
        <p className="unave-widget__meta">
          <Link href="/admin/collections/orders?where[paymentState][equals]=cashDue">
            {formatPaise(today.cashDue.total)} cash due · {today.cashDue.count}{' '}
            {today.cashDue.count === 1 ? 'order' : 'orders'}
          </Link>
        </p>
      ) : null}
      <DayBars noun="Paid orders" points={perDay} />
      <Link className="unave-widget__link" href="/admin/collections/orders">
        Open orders
      </Link>
    </div>
  )
}

export default OrdersToday
