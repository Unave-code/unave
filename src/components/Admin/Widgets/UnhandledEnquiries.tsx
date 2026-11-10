import { Link } from '@payloadcms/ui/elements/Link'
import type { WidgetServerProps } from 'payload'
import React from 'react'

import './widgets.scss'

/**
 * Contact-form messages still waiting for a reply, with the most recent one
 * named so the counter knows whose message is at the top of the pile.
 */
const UnhandledEnquiries = async ({ req }: WidgetServerProps) => {
  const waiting = { handled: { equals: false } }

  const [total, latest] = await Promise.all([
    req.payload.count({ collection: 'enquiries', where: waiting }),
    req.payload.find({
      collection: 'enquiries',
      limit: 1,
      sort: '-createdAt',
      where: waiting,
    }),
  ])

  const last = latest.docs[0]
  const lastLine = last
    ? `${last.name ?? 'A customer'} · ${new Date(String(last.createdAt)).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      })}`
    : 'Nothing waiting'

  return (
    <div className="card unave-widget">
      <p className="unave-widget__eyebrow">Messages to answer</p>
      <p className="unave-widget__figure">{total.totalDocs}</p>
      <p className="unave-widget__meta">{lastLine}</p>
      <Link className="unave-widget__link" href="/admin/collections/enquiries?where[handled][equals]=false">
        Open enquiries
      </Link>
    </div>
  )
}

export default UnhandledEnquiries
