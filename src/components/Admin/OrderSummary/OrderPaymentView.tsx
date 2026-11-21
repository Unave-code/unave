import React from 'react'

import { formatPaise } from '@/utilities/money'
import { type OrderPaymentDetails, paymentMethodLabel } from '@/utilities/razorpayPaymentDetails'

import { CopyValue } from './CopyValue'
import { dateTime } from './OrderSummaryView'
import './OrderSummary.scss'

/**
 * The payment, in the order page's sidebar above the delivery start day.
 * Only what Razorpay gave us is shown, row by row; the signature stays hidden.
 * The time is Razorpay's capture time when it sent one, else the moment the
 * order was written.
 */
export function OrderPaymentView({
  details = {},
  gatewayOrderId,
  gatewayPaymentId,
  paidAt,
}: {
  details?: null | OrderPaymentDetails
  gatewayOrderId?: null | string
  gatewayPaymentId?: null | string
  paidAt?: null | string
}): React.JSX.Element | null {
  const d = details ?? {}
  const card = [d.cardNetwork, d.cardType].filter(Boolean).join(' ')
  const cardLabel = d.cardLast4 ? `${card ? `${card} ` : ''}···· ${d.cardLast4}` : card
  const when = d.capturedAt ?? paidAt ?? null

  const rows: [string, React.ReactNode][] = []
  if (d.method) rows.push(['Method', paymentMethodLabel(d.method)])
  if (d.vpa) rows.push(['UPI id', d.vpa])
  if (cardLabel) rows.push(['Card used', cardLabel])
  if (d.bank) rows.push(['Bank', d.bank])
  if (d.wallet) rows.push(['Wallet', d.wallet])
  if (d.bankReference) rows.push(['Bank reference', <CopyValue key="ref" label="Bank reference" value={d.bankReference} />])
  if (gatewayOrderId) rows.push(['Razorpay order', <CopyValue key="order" label="Razorpay order id" value={gatewayOrderId} />])
  if (gatewayPaymentId) rows.push(['Razorpay payment', <CopyValue key="payment" label="Razorpay payment id" value={gatewayPaymentId} />])
  if (when) rows.push(['Paid at', dateTime(when)])
  if (typeof d.fee === 'number') rows.push(['Razorpay fee', formatPaise(d.fee)])
  if (typeof d.tax === 'number') rows.push(['GST on fee', formatPaise(d.tax)])
  if (d.email) rows.push(['Payer email', d.email])
  if (d.contact) rows.push(['Payer phone', d.contact])

  if (rows.length === 0) return null

  return (
    <section className="order-payment">
      <h3 className="order-summary__card-title">Payment</h3>
      <dl className="order-payment__rows">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
