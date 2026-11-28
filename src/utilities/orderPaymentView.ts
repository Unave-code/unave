import type { Order } from '@/payload-types'

import { formatPaise } from './money'

/**
 * How an order's payment reads to the customer (spec 2026-11-28 cash on
 * delivery). The order page, the account list and the emails share it, so a
 * cash order never says "paid" before the cash is in.
 */

export const cashDueLine = (total: number): string =>
  `Cash on delivery: ${formatPaise(total)} due at your first delivery.`

export const kitchenCashLine = (total: number): string =>
  `Cash due: ${formatPaise(total)}, to collect at the first delivery.`

export type OrderPaymentView = {
  amountLabel: 'Amount due' | 'Amount paid'
  /** True for any cash on delivery order, whatever its state. */
  cash: boolean
  /** The "₹X due at your first delivery" sentence, only while the cash is due. */
  cashLine: null | string
  statusLabel: 'Cancelled' | 'Cash due' | 'Paid' | 'Paid in cash'
}

export const orderPaymentView = (
  order: Partial<Pick<Order, 'paymentState' | 'paymentType' | 'total'>>,
): OrderPaymentView => {
  if (order.paymentType !== 'cash') {
    return { amountLabel: 'Amount paid', cash: false, cashLine: null, statusLabel: 'Paid' }
  }

  switch (order.paymentState) {
    case 'collected':
      return { amountLabel: 'Amount paid', cash: true, cashLine: null, statusLabel: 'Paid in cash' }
    case 'cancelled':
      return { amountLabel: 'Amount due', cash: true, cashLine: null, statusLabel: 'Cancelled' }
    default:
      return {
        amountLabel: 'Amount due',
        cash: true,
        cashLine: cashDueLine(Number(order.total ?? 0)),
        statusLabel: 'Cash due',
      }
  }
}
