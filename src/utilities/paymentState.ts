import type { Order } from '@/payload-types'

/** How staff read an order's payment state, in the admin and the reports. */
export const PAYMENT_STATE_LABELS: Record<Order['paymentState'], string> = {
  cancelled: 'Cancelled',
  cashDue: 'Cash due',
  collected: 'Collected',
  paid: 'Online',
}
