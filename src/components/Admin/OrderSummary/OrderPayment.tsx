import type { UIFieldServerProps } from 'payload'
import React from 'react'

import type { Order } from '@/payload-types'
import { formatPaise } from '@/utilities/money'
import type { OrderPaymentDetails } from '@/utilities/razorpayPaymentDetails'

import { CashActions } from './CashActions'
import { OrderPaymentView } from './OrderPaymentView'

const text = (value: unknown): null | string => (typeof value === 'string' && value ? value : null)

/** The stored group as plain details: Payload reads an empty column back as null. */
const detailsOf = (payment: Order['payment']): OrderPaymentDetails =>
  Object.fromEntries(
    Object.entries(payment ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  ) as OrderPaymentDetails

/** The staff member who took the cash, by name, when the account can still be read. */
const collectorName = async (
  payload: UIFieldServerProps['payload'],
  collectedBy: Order['collectedBy'],
): Promise<null | string> => {
  if (collectedBy && typeof collectedBy === 'object') return collectedBy.name || collectedBy.email || null
  if (typeof collectedBy !== 'number') return null

  try {
    const user = await payload.findByID({ collection: 'users', depth: 0, id: collectedBy, overrideAccess: true })
    return user.name || user.email || null
  } catch {
    return null
  }
}

/** The sidebar's payment block, read from the order the form holds. */
export const OrderPayment = async ({ data, payload }: UIFieldServerProps) => {
  const order = (data ?? {}) as Partial<Order>

  if (order.paymentType === 'cash' && order.paymentState) {
    const due = order.paymentState === 'cashDue' && order.id !== undefined

    return (
      <OrderPaymentView
        actions={due ? <CashActions orderId={order.id as number} total={formatPaise(Number(order.total ?? 0))} /> : null}
        cash={{
          cancelledAt: text(order.cancelledAt),
          collectedBy: await collectorName(payload, order.collectedBy),
          state: order.paymentState,
        }}
        paidAt={text(order.paidAt)}
      />
    )
  }

  return (
    <OrderPaymentView
      details={detailsOf(order.payment)}
      gatewayOrderId={text(order.gatewayOrderId)}
      gatewayPaymentId={text(order.gatewayPaymentId)}
      paidAt={text(order.paidAt)}
    />
  )
}
