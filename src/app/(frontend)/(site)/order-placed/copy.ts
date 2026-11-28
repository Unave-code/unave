/**
 * The words on the order pages (spec 0007).
 */

export const ORDER_PLACED_TITLE = 'Order placed'

export const ORDER_PAID_HEADING = 'Your order is confirmed'
export const ORDER_PAID_BODY =
  'The kitchen has your order and will message you about when deliveries begin. Keep the payment id below as your receipt.'

/** A cash on delivery order (spec 2026-11-28): placed, not yet paid. */
export const ORDER_CASH_HEADING = 'Your order is placed'
export const ORDER_CASH_BODY =
  'The kitchen has your order and will message you about when deliveries begin.'
export const ORDER_CANCELLED_HEADING = 'This order was cancelled'
export const ORDER_CANCELLED_BODY =
  'The kitchen cancelled this cash on delivery order. Message us if that looks wrong.'
export const ORDER_PAYING_BY_LABEL = 'Paying by'
export const ORDER_PAYING_BY_CASH = 'Cash on delivery'
export const ORDER_CASH_PLACED_STEP = 'Order placed'

export const ORDER_LINES_HEADING = 'What you ordered'
export const ORDER_AMOUNT_LABEL = 'Amount paid'
export const ORDER_PAYMENT_ID_LABEL = 'Payment id'
export const ORDER_STATUS_LABEL = 'Status'
export const ORDER_NOT_GIVEN = 'To be set by the kitchen'
export const ORDER_BACK_TO_ACCOUNT = 'Back to your account'
export const ORDER_BROWSE_CTA = 'Browse the products'
export const ORDER_NUMBER_LABEL = 'Order'
export const ORDER_PAID_ON_LABEL = 'Paid on'
export const ORDER_PAID_WITH_LABEL = 'Paid with'
export const ORDER_DELIVERY_HEADING = 'Delivering to'
export const ORDER_NEXT_HEADING = 'What happens next'
export const ORDER_NEXT_STEPS: ReadonlyArray<{ body: string; title: string }> = [
  { body: 'Your payment went through and the order is saved.', title: 'Payment confirmed' },
  {
    body: 'The kitchen will message you about when deliveries begin.',
    title: 'The kitchen gets in touch',
  },
  {
    body: 'Every order you place is listed on your account page.',
    title: 'Find it in your account',
  },
]

export const ACCOUNT_ORDERS_HEADING = 'Your orders'
export const ACCOUNT_ORDERS_INTRO = 'Every order you have placed, newest first.'
export const ACCOUNT_ORDERS_EMPTY = 'No orders yet. When you order, it shows up here.'
export const ACCOUNT_ORDER_STATUS_PAID = 'Paid'
