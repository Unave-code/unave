import React from 'react'

import { CopyValue } from './CopyValue'
import { dateTime } from './OrderSummaryView'
import './OrderSummary.scss'

/**
 * The payment, in the order page's sidebar above the delivery start day.
 * Only what the gateway gave us is shown; the signature stays hidden.
 */
export function OrderPaymentView({
  gatewayOrderId,
  gatewayPaymentId,
  paidAt,
}: {
  gatewayOrderId?: null | string
  gatewayPaymentId?: null | string
  paidAt?: null | string
}): React.JSX.Element | null {
  if (!gatewayOrderId && !gatewayPaymentId && !paidAt) return null

  return (
    <section className="order-payment">
      <h3 className="order-summary__card-title">Payment</h3>
      <dl className="order-payment__rows">
        {gatewayOrderId ? (
          <div>
            <dt>Razorpay order</dt>
            <dd>
              <CopyValue label="Razorpay order id" value={gatewayOrderId} />
            </dd>
          </div>
        ) : null}
        {gatewayPaymentId ? (
          <div>
            <dt>Razorpay payment</dt>
            <dd>
              <CopyValue label="Razorpay payment id" value={gatewayPaymentId} />
            </dd>
          </div>
        ) : null}
        {paidAt ? (
          <div>
            <dt>Paid at</dt>
            <dd>{dateTime(paidAt)}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  )
}
