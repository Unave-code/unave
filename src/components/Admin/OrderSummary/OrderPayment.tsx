import type { UIFieldServerProps } from 'payload'
import React from 'react'

import type { Order } from '@/payload-types'
import type { OrderPaymentDetails } from '@/utilities/razorpayPaymentDetails'

import { OrderPaymentView } from './OrderPaymentView'

const text = (value: unknown): null | string => (typeof value === 'string' && value ? value : null)

/** The stored group as plain details: Payload reads an empty column back as null. */
const detailsOf = (payment: Order['payment']): OrderPaymentDetails =>
  Object.fromEntries(
    Object.entries(payment ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  ) as OrderPaymentDetails

/** The sidebar's payment block, read from the order the form holds. */
export const OrderPayment: React.FC<UIFieldServerProps> = ({ data }) => (
  <OrderPaymentView
    details={detailsOf((data as Partial<Order> | undefined)?.payment)}
    gatewayOrderId={text(data?.gatewayOrderId)}
    gatewayPaymentId={text(data?.gatewayPaymentId)}
    paidAt={text(data?.paidAt)}
  />
)
