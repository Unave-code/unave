import type { UIFieldServerProps } from 'payload'
import React from 'react'

import { OrderPaymentView } from './OrderPaymentView'

/** The sidebar's payment block, read from the order the form holds. */
export const OrderPayment: React.FC<UIFieldServerProps> = ({ data }) => (
  <OrderPaymentView
    gatewayOrderId={typeof data?.gatewayOrderId === 'string' ? data.gatewayOrderId : null}
    gatewayPaymentId={typeof data?.gatewayPaymentId === 'string' ? data.gatewayPaymentId : null}
    paidAt={typeof data?.paidAt === 'string' ? data.paidAt : null}
  />
)
