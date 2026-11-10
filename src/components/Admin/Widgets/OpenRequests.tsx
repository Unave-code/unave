import { Link } from '@payloadcms/ui/elements/Link'
import type { WidgetServerProps } from 'payload'
import React from 'react'

import './widgets.scss'

/**
 * Customer requests (cancellations and pauses) that no staff member has picked
 * up yet — the counter's to-do list for the day.
 */
const OpenRequests = async ({ req }: WidgetServerProps) => {
  const open = { status: { equals: 'new' } }

  const [total, cancellations, pauses] = await Promise.all([
    req.payload.count({ collection: 'order-requests', where: open }),
    req.payload.count({ collection: 'order-requests', where: { and: [open, { type: { equals: 'cancel' } }] } }),
    req.payload.count({ collection: 'order-requests', where: { and: [open, { type: { equals: 'pause' } }] } }),
  ])

  return (
    <div className="card unave-widget">
      <p className="unave-widget__eyebrow">Open requests</p>
      <p className="unave-widget__figure">{total.totalDocs}</p>
      <p className="unave-widget__meta">
        {cancellations.totalDocs} cancellations · {pauses.totalDocs} pauses
      </p>
      <Link className="unave-widget__link" href="/admin/collections/order-requests?where[status][equals]=new">
        Open requests
      </Link>
    </div>
  )
}

export default OpenRequests
