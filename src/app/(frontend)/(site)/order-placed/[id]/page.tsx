import { ArrowLeft, Check } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { Cta } from '@/components/Cta'
import type { Order } from '@/payload-types'
import { formatPaise } from '@/utilities/money'
import { paymentMethodLabel } from '@/utilities/razorpayPaymentDetails'
import {
  isOneTimeOrderItem,
  orderComponentsLabel,
  orderItemKind,
} from '@/utilities/orderDisplay'
import { getSignedInCustomer } from '@/utilities/customerSessionServer'

import {
  ACCOUNT_ORDER_STATUS_PAID,
  ORDER_AMOUNT_LABEL,
  ORDER_BACK_TO_ACCOUNT,
  ORDER_BROWSE_CTA,
  ORDER_DELIVERY_HEADING,
  ORDER_LINES_HEADING,
  ORDER_NEXT_HEADING,
  ORDER_NEXT_STEPS,
  ORDER_NOT_GIVEN,
  ORDER_NUMBER_LABEL,
  ORDER_PAID_BODY,
  ORDER_PAID_HEADING,
  ORDER_PAID_ON_LABEL,
  ORDER_PAID_WITH_LABEL,
  ORDER_PAYMENT_ID_LABEL,
  ORDER_PLACED_TITLE,
  ORDER_STATUS_LABEL,
} from '../copy'

/**
 * The order page a customer lands on after paying (spec 0007, AC-5 and AC-7).
 *
 * Only the owner may read it: the row is fetched and then compared against the
 * session, and anything else is a plain not found, so the page never confirms
 * that somebody else's order exists. The page shows the snapshot the order
 * stores, never the live product, because a past order must not follow later
 * price edits.
 *
 * The confirmation leads on the deep green band; the receipt card rises over
 * its lower edge, with where it goes and what happens next beside it. Every row
 * here is a completed payment, so there is no pending state to show.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { follow: false, index: false, nocache: true },
  title: ORDER_PLACED_TITLE,
}

const PAID_ON = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
})

const CARD = 'bg-card rounded-2xl p-6 shadow-md sm:p-8'

const Detail: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <dt className="text-ink-600 text-sm">{label}</dt>
    <dd className="text-ink-900 text-sm font-semibold break-words">{value}</dd>
  </div>
)

/** "UPI · name@bank", "Visa debit card ending 0153": only what Razorpay sent. */
const paidWith = (payment: Order['payment']): null | string => {
  if (!payment?.method) return null
  const method = paymentMethodLabel(payment.method)

  if (payment.cardLast4) {
    const kind = [payment.cardNetwork, payment.cardType].filter(Boolean).join(' ')
    return `${kind ? `${kind} card` : 'Card'} ending ${payment.cardLast4}`
  }
  if (payment.vpa) return `${method} · ${payment.vpa}`
  if (payment.bank) return `${method} · ${payment.bank}`
  if (payment.wallet) return `${method} · ${payment.wallet}`

  return method
}

export default async function OrderPlacedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await getSignedInCustomer()

  if (!customer) notFound()

  const payload = await getPayload({ config: configPromise })

  let order: Order | null = null

  try {
    order = (await payload.findByID({
      collection: 'orders',
      depth: 0,
      id,
      overrideAccess: true,
    })) as Order | null
  } catch {
    order = null
  }

  // Not found, or not yours: the same answer either way.
  if (!order || String(order.customer) !== String(customer.id)) notFound()

  const paidOn = order.paidAt ? PAID_ON.format(new Date(order.paidAt)) : null
  const method = paidWith(order.payment)
  const delivery = order.delivery
  const address = [
    delivery?.addressLine1,
    delivery?.addressLine2,
    [delivery?.city, delivery?.state].filter(Boolean).join(', '),
    delivery?.pincode,
  ].filter((line): line is string => Boolean(line && line.trim()))

  return (
    <>
      <section className="bg-green-900 text-cream pt-14 pb-24 md:pt-20 md:pb-32">
        <div className="container max-w-3xl text-center">
          <span
            aria-hidden="true"
            className="bg-gold-400 mx-auto grid size-16 place-items-center rounded-full text-green-900 shadow-md"
          >
            <Check className="size-8" strokeWidth={3} />
          </span>

          <h1 className="text-cream mt-6 text-[28px] leading-tight font-extrabold tracking-[-0.02em] text-balance md:text-[40px]">
            {ORDER_PAID_HEADING}
          </h1>
          <p className="text-cream/80 mx-auto mt-3 max-w-[56ch] text-base leading-relaxed text-pretty">
            {ORDER_PAID_BODY}
          </p>

          <ul className="mt-7 flex flex-wrap items-center justify-center gap-2 text-sm">
            <li className="border-cream/25 rounded-pill border px-3.5 py-1.5">
              {ORDER_NUMBER_LABEL} <span className="font-bold tabular-nums">#{order.id}</span>
            </li>
            {paidOn ? (
              <li className="border-cream/25 rounded-pill border px-3.5 py-1.5">
                {ORDER_PAID_ON_LABEL} <span className="font-bold">{paidOn}</span>
              </li>
            ) : null}
            <li className="border-cream/25 rounded-pill border px-3.5 py-1.5">
              {ORDER_AMOUNT_LABEL}{' '}
              <span className="text-gold-400 font-bold tabular-nums">{formatPaise(Number(order.total))}</span>
            </li>
          </ul>
        </div>
      </section>

      <div className="container relative -mt-16 max-w-5xl pb-16 md:-mt-20 md:pb-24">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section aria-labelledby="order-lines-heading" className={CARD}>
            <h2 className="text-h3 text-green-900" id="order-lines-heading">
              {ORDER_LINES_HEADING}
            </h2>

            <ul className="border-line divide-line mt-5 divide-y border-t">
              {(order.items ?? []).map((item, index) => {
                const qty =
                  typeof item.qty === 'number' && Number.isInteger(item.qty) && item.qty >= 1
                    ? item.qty
                    : 1
                const isOneTime = isOneTimeOrderItem(item)
                const unitPrice = Number(item.unitPrice)
                const components = orderComponentsLabel(item.components)

                return (
                  <li className="flex items-start justify-between gap-4 py-4" key={item.id ?? index}>
                    <div className="min-w-0">
                      <p className="text-ink-900 font-bold">
                        {qty > 1 ? `${qty} × ${item.productTitle}` : item.productTitle}
                      </p>
                      <p className="text-ink-600 mt-0.5 text-sm">
                        {isOneTime
                          ? orderItemKind(item)
                          : `${item.durationLabel}, ${Number(item.days)} ${
                              Number(item.days) === 1 ? 'day' : 'days'
                            } of meals`}
                      </p>
                      {components ? (
                        <p className="text-ink-600 mt-1 text-sm">Includes: {components}</p>
                      ) : null}
                    </div>

                    <p className="text-ink-900 shrink-0 text-right font-bold tabular-nums">
                      {formatPaise(unitPrice * qty)}
                    </p>
                  </li>
                )
              })}
            </ul>

            <div className="border-line flex items-baseline justify-between gap-4 border-t pt-5">
              <p className="text-ink-900 font-bold">{ORDER_AMOUNT_LABEL}</p>
              <p className="text-[28px] leading-none font-extrabold text-green-900 tabular-nums">
                {formatPaise(Number(order.total))}
              </p>
            </div>

            <dl className="mt-6 grid gap-5 rounded-xl bg-green-50 p-5 sm:grid-cols-2">
              <Detail
                label={ORDER_STATUS_LABEL}
                value={
                  <span className="rounded-pill inline-flex items-center gap-1.5 bg-green-100 px-2.5 py-0.5 text-green-800">
                    <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                    {ACCOUNT_ORDER_STATUS_PAID}
                  </span>
                }
              />
              {method ? <Detail label={ORDER_PAID_WITH_LABEL} value={method} /> : null}
              <div className="sm:col-span-2">
                <Detail
                  label={ORDER_PAYMENT_ID_LABEL}
                  value={<span className="tabular-nums select-all">{order.gatewayPaymentId ?? ORDER_NOT_GIVEN}</span>}
                />
              </div>
            </dl>
          </section>

          <div className="grid gap-6">
            {delivery?.name || address.length > 0 ? (
              <section aria-labelledby="order-delivery-heading" className={CARD}>
                <h2 className="text-lg font-extrabold text-green-900" id="order-delivery-heading">
                  {ORDER_DELIVERY_HEADING}
                </h2>
                <address className="text-ink-600 mt-3 text-sm leading-relaxed not-italic">
                  {delivery?.name ? <span className="text-ink-900 block font-semibold">{delivery.name}</span> : null}
                  {address.map((line) => (
                    <span className="block" key={line}>
                      {line}
                    </span>
                  ))}
                  {delivery?.phone ? <span className="mt-2 block tabular-nums">{delivery.phone}</span> : null}
                </address>
              </section>
            ) : null}

            <section aria-labelledby="order-next-heading" className={CARD}>
              <h2 className="text-lg font-extrabold text-green-900" id="order-next-heading">
                {ORDER_NEXT_HEADING}
              </h2>
              <ol className="mt-4 grid gap-5">
                {ORDER_NEXT_STEPS.map((step, index) => (
                  <li className="flex gap-3.5" key={step.title}>
                    <span
                      aria-hidden="true"
                      className={
                        index === 0
                          ? 'grid size-7 shrink-0 place-items-center rounded-full bg-green-700 text-cream'
                          : 'grid size-7 shrink-0 place-items-center rounded-full bg-green-100 text-sm font-bold text-green-800'
                      }
                    >
                      {index === 0 ? <Check className="size-4" strokeWidth={3} /> : index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-ink-900 text-sm font-bold">{step.title}</p>
                      <p className="text-ink-600 mt-0.5 text-sm leading-relaxed">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>

        <div className="mt-10 flex flex-col-reverse items-center justify-center gap-4 sm:flex-row sm:gap-8">
          <Link
            className="text-green-700 hover:opacity-75 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold transition-opacity focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none motion-reduce:transition-none"
            href="/account?tab=orders"
          >
            <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
            {ORDER_BACK_TO_ACCOUNT}
          </Link>

          <Cta href="/products" variant="primary">
            {ORDER_BROWSE_CTA}
          </Cta>
        </div>
      </div>
    </>
  )
}
