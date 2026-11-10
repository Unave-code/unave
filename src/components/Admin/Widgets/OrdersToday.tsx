import { Link } from '@payloadcms/ui/elements/Link'
import type { WidgetServerProps } from 'payload'
import React from 'react'

import { formatPaise } from '@/utilities/money'

import './widgets.scss'

/**
 * The kitchen's day is an Indian day, whatever timezone the server happens to
 * run in: production deploys in UTC, so "today" is measured from midnight IST
 * (UTC+5:30), not from the server's own midnight.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

const istStartOfDay = (): Date => {
  const shifted = new Date(Date.now() + IST_OFFSET_MS)
  const utcMidnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())

  return new Date(utcMidnight - IST_OFFSET_MS)
}

/** How many orders the kitchen took today, and what they came to. */
const OrdersToday = async ({ req }: WidgetServerProps) => {
  const paidToday = await req.payload.find({
    collection: 'orders',
    limit: 200,
    select: { total: true },
    where: { paidAt: { greater_than_equal: istStartOfDay().toISOString() } },
  })

  const collected = paidToday.docs.reduce((sum, order) => sum + (order.total ?? 0), 0)

  return (
    <div className="card unave-widget">
      <p className="unave-widget__eyebrow">Orders today</p>
      <p className="unave-widget__figure">{paidToday.totalDocs}</p>
      <p className="unave-widget__meta">{formatPaise(collected)} collected</p>
      <Link className="unave-widget__link" href="/admin/collections/orders">
        Open orders
      </Link>
    </div>
  )
}

export default OrdersToday
