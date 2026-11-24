import React from 'react'

import type { Order, OrderRequest } from '@/payload-types'
import { FOOD_PREFERENCE_LABELS, isFoodPreference } from '@/utilities/foodPreference'
import { formatPaise } from '@/utilities/money'
import { orderKindSummary, type OrderLineView } from '@/utilities/orderLines'

import './OrderSummary.scss'

/**
 * The admin order page, read like a receipt (design:
 * docs/superpowers/specs/2026-11-21-admin-order-detail-design.md).
 *
 * Presentational only: `OrderSummary` loads the order, its customer, its
 * requests and the meal plans its lines name, and passes plain values here.
 * Nothing renders as an input; the one editable value, the delivery start day,
 * stays in Payload's own sidebar, beside the payment (`OrderPaymentView`).
 *
 * Only what the order holds is shown: an empty value leaves its row out
 * rather than printing a placeholder, and the requests card appears only when
 * the customer has asked for something.
 */

export type OrderSummaryProps = {
  order: Pick<Order, 'createdAt' | 'delivery' | 'gatewayOrderId' | 'gatewayPaymentId' | 'id' | 'paidAt' | 'subtotal' | 'total' | 'updatedAt'>
  customer: { id: number; name: null | string; email: string; phone: null | string } | null
  lines: OrderLineView[]
  requests: Pick<OrderRequest, 'createdAt' | 'id' | 'pauseFrom' | 'pauseTo' | 'reason' | 'staffNote' | 'status' | 'type'>[]
}

const IST = 'Asia/Kolkata'

export const dateTime = (value: string): string =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: IST }).format(new Date(value))

const dateOnly = (value: string): string =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: IST }).format(new Date(value))

const present = (value: null | string | undefined): value is string => typeof value === 'string' && value.trim().length > 0

const daysLabel = (days: number): string => `${days} ${days === 1 ? 'day' : 'days'}`

const Section: React.FC<{ children: React.ReactNode; title: string; className?: string }> = ({ children, title, className }) => (
  <section className={['card', 'order-summary__card', className].filter(Boolean).join(' ')}>
    <h3 className="order-summary__card-title">{title}</h3>
    {children}
  </section>
)

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="order-summary__row">
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
)

const ProductLink: React.FC<{ id: null | number }> = ({ id }) =>
  id === null ? null : (
    <a className="order-summary__link" href={`/admin/collections/products/${id}`}>
      Open product
    </a>
  )

const KIND_TAG: Record<OrderLineView['kind'], string> = {
  combo: 'Combo',
  item: 'Single item',
  plan: 'Meal plan',
  subscription: 'Subscription',
  unknown: 'Order line',
}

const LineBody: React.FC<{ line: OrderLineView }> = ({ line }) => {
  switch (line.kind) {
    case 'subscription':
      return (
        <dl className="order-summary__rows">
          <Row label="Meal">{line.meal}</Row>
          <Row label="Length">{`${line.length} · ${daysLabel(line.days)}`}</Row>
          {line.people ? <Row label="People">{line.people}</Row> : null}
          {line.picks.length === 0 ? null : line.groups ? (
            line.groups.map((group) => (
              <Row key={group.title} label={group.title}>
                {group.picks.join(' · ')}
              </Row>
            ))
          ) : (
            <Row label="Choices">{line.picks.join(' · ')}</Row>
          )}
        </dl>
      )
    case 'plan':
      return (
        <dl className="order-summary__rows">
          <Row label="Duration">{`${line.duration} · ${daysLabel(line.days)}`}</Row>
        </dl>
      )
    case 'combo':
      return (
        <dl className="order-summary__rows">
          <Row label="Quantity">{`${line.qty} × ${formatPaise(line.unitPrice)}`}</Row>
          <Row label="Includes">{line.includes.join(' · ')}</Row>
        </dl>
      )
    case 'item':
      return (
        <dl className="order-summary__rows">
          {line.size ? <Row label="Size">{line.size}</Row> : null}
          <Row label="Quantity">{`${line.qty} × ${formatPaise(line.unitPrice)}`}</Row>
        </dl>
      )
    default:
      return line.detail ? (
        <dl className="order-summary__rows">
          <Row label="Detail">{line.detail}</Row>
        </dl>
      ) : null
  }
}

const Line: React.FC<{ line: OrderLineView }> = ({ line }) => (
  <li className="order-summary__line">
    <div className="order-summary__line-head">
      <div className="order-summary__line-name">
        <p className="order-summary__tags">
          <span className={`order-summary__tag order-summary__tag--${line.kind}`}>{KIND_TAG[line.kind]}</span>
          {line.kind === 'subscription' && line.trial ? (
            <span className="order-summary__tag order-summary__tag--trial">Trial</span>
          ) : null}
        </p>
        <p className="order-summary__line-title">{line.title}</p>
      </div>
      <div className="order-summary__line-price">
        <p className="order-summary__money">{formatPaise(line.lineTotal)}</p>
        {(line.kind === 'subscription' || line.kind === 'plan') && line.perDay > 0 ? (
          <p className="order-summary__muted">{`${formatPaise(line.perDay)} a day`}</p>
        ) : null}
      </div>
    </div>
    <LineBody line={line} />
    {'productId' in line ? <ProductLink id={line.productId} /> : null}
  </li>
)

export function OrderSummaryView({ customer, lines, order, requests }: OrderSummaryProps): React.JSX.Element {
  const delivery = order.delivery ?? {}
  // "No preference" is the default, not something the customer told us.
  const preference =
    isFoodPreference(delivery.foodPreference) && delivery.foodPreference !== 'none'
      ? FOOD_PREFERENCE_LABELS[delivery.foodPreference]
      : null
  const place = [[delivery.city, delivery.state].filter(present).join(', '), delivery.pincode]
    .filter(present)
    .join(' ')
  const address = [delivery.addressLine1, delivery.addressLine2, place].filter(present)
  const hasDelivery = present(delivery.name) || present(delivery.phone) || address.length > 0 || preference || present(delivery.note)
  const record = [
    order.createdAt ? `Created ${dateTime(order.createdAt)}` : null,
    order.updatedAt ? `Last updated ${dateTime(order.updatedAt)}` : null,
  ].filter(present)
  const summary = orderKindSummary(lines)

  return (
    <div className="order-summary">
      <header className="card order-summary__header">
        <div>
          <h2 className="order-summary__title">{`Order ${order.id}`}</h2>
          <p className="order-summary__meta">
            <span className="order-summary__pill order-summary__pill--ok">Paid</span>
            {order.paidAt ? <span>{`Paid ${dateTime(order.paidAt)}`}</span> : null}
          </p>
          {summary ? <p className="order-summary__muted">{summary}</p> : null}
        </div>
        <p className="order-summary__total">{formatPaise(Number(order.total ?? 0))}</p>
      </header>

      <div className="order-summary__grid">
        <Section className="order-summary__items" title="Items">
          <ul className="order-summary__lines">
            {lines.map((line, index) => (
              <Line key={index} line={line} />
            ))}
          </ul>
          <dl className="order-summary__rows order-summary__totals">
            <Row label="Subtotal">{formatPaise(Number(order.subtotal ?? 0))}</Row>
            <Row label="Total">{formatPaise(Number(order.total ?? 0))}</Row>
          </dl>
        </Section>

        <div className="order-summary__side">
          <Section title="Customer">
            {customer ? (
              <dl className="order-summary__rows">
                {present(customer.name) ? <Row label="Name">{customer.name}</Row> : null}
                <Row label="Email">
                  <a className="order-summary__link" href={`mailto:${customer.email}`}>
                    {customer.email}
                  </a>
                </Row>
                {customer.phone ? (
                  <Row label="Phone">
                    <a className="order-summary__link" href={`tel:${customer.phone}`}>
                      {customer.phone}
                    </a>
                  </Row>
                ) : null}
                <a className="order-summary__link" href={`/admin/collections/customers/${customer.id}`}>
                  Open customer
                </a>
              </dl>
            ) : (
              <p className="order-summary__muted">Customer record not found</p>
            )}
          </Section>

          {hasDelivery ? (
            <Section title="Delivery">
              <dl className="order-summary__rows">
                {present(delivery.name) ? <Row label="Name">{delivery.name}</Row> : null}
                {present(delivery.phone) ? (
                  <Row label="Phone">
                    <a className="order-summary__link" href={`tel:${delivery.phone}`}>
                      {delivery.phone}
                    </a>
                  </Row>
                ) : null}
                {address.length > 0 ? (
                  <Row label="Address">
                    {address.map((part, index) => (
                      <span className="order-summary__address-line" key={index}>
                        {part}
                      </span>
                    ))}
                  </Row>
                ) : null}
                {preference ? <Row label="Food preference">{preference}</Row> : null}
              </dl>
              {present(delivery.note) ? (
                <div className="order-summary__note">
                  <p className="order-summary__note-title">Customer note</p>
                  <p>{delivery.note}</p>
                </div>
              ) : null}
            </Section>
          ) : null}
        </div>
      </div>

      {requests.length > 0 ? (
        <Section title="Requests">
          <ul className="order-summary__requests">
            {requests.map((request) => {
              const pause = [
                request.pauseFrom ? `from ${dateOnly(request.pauseFrom)}` : null,
                request.pauseTo ? `to ${dateOnly(request.pauseTo)}` : null,
              ].filter(present)

              return (
                <li className="order-summary__request" key={request.id}>
                  <p className="order-summary__meta">
                    <strong>{request.type === 'pause' ? 'Pause' : 'Cancellation'}</strong>
                    <span
                      className={`order-summary__pill order-summary__pill--${request.status === 'handled' ? 'ok' : 'new'}`}
                    >
                      {request.status === 'handled' ? 'Handled' : 'New'}
                    </span>
                    {request.createdAt ? (
                      <span className="order-summary__muted">{`Asked ${dateTime(request.createdAt)}`}</span>
                    ) : null}
                  </p>
                  {request.type === 'pause' && pause.length > 0 ? <p>{`Pause ${pause.join(' ')}`}</p> : null}
                  {present(request.reason) ? <p>{request.reason}</p> : null}
                  {present(request.staffNote) ? (
                    <p className="order-summary__muted">{`Kitchen note: ${request.staffNote}`}</p>
                  ) : null}
                  <a className="order-summary__link" href={`/admin/collections/order-requests/${request.id}`}>
                    Open request
                  </a>
                </li>
              )
            })}
          </ul>
        </Section>
      ) : null}

      {record.length > 0 ? <p className="order-summary__record">{record.join(' · ')}</p> : null}
    </div>
  )
}
