import type { Endpoint, Payload } from 'payload'

import type { CheckoutIntent, Order } from '@/payload-types'
import { runAfterReply } from '@/utilities/afterReply'
import { clearCartCookie } from '@/utilities/cart'
import { errorMessage } from '@/utilities/errorMessage'
import { formatPaise } from '@/utilities/money'

import { json, prepareCheckout, type PreparedCheckout } from './checkout'
import { readCheckoutIntent } from './intent'
import { sendOrderMails } from './mail'
import { orderCashSchema } from './schema'

/**
 * Cash on delivery (spec 2026-11-28). The order is written as soon as the
 * checks pass: there is no payment to wait for, so it starts as Cash due and
 * staff move it to Collected or Cancelled (cashActions.ts). It runs the same
 * checks as an online order and never touches Razorpay, so it works while the
 * gateway is down or not set up.
 */

export const COD_OFF =
  'Cash on delivery isn’t available right now. Please pay online to place your order.'
export const codLimitMessage = (max: number): string =>
  `Cash on delivery is available for orders up to ${formatPaise(max)}. Please pay online for this order.`
const ORDER_NOT_SAVED = 'Your order could not be saved. Please try again.'

const findByCashKey = async (payload: Payload, cashKey: string): Promise<Order | null> => {
  const found = await payload.find({
    collection: 'orders',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { cashKey: { equals: cashKey } },
  })

  return (found.docs[0] as Order | undefined) ?? null
}

/**
 * Writes the cash order once per key. Two racing submits both try to insert;
 * the unique key refuses the second, which reads the winner's row instead and
 * reports `recorded: false` so it sends no mail.
 */
export const recordCashOrder = async (
  payload: Payload,
  checkout: PreparedCheckout,
  cashKey: string,
): Promise<{ order: Order; recorded: boolean }> => {
  const already = await findByCashKey(payload, cashKey)
  if (already) return { order: already, recorded: false }

  // The same reader the online path writes from turns the checked lines into
  // the order's own shape (productRef → product, addonRef → addon), so a cash
  // order keeps the same snapshot, product links included.
  const intent = readCheckoutIntent({
    customer: Number(checkout.customer.id),
    delivery: checkout.delivery,
    id: 0,
    items: checkout.items,
    total: checkout.total,
  } as CheckoutIntent)

  if (!intent) throw new Error('cash_order_snapshot_unreadable')

  try {
    const order = (await payload.create({
      collection: 'orders',
      data: {
        cashKey,
        customer: Number(checkout.customer.id),
        delivery: intent.delivery,
        items: intent.items,
        paymentState: 'cashDue',
        paymentType: 'cash',
        subtotal: checkout.total,
        total: checkout.total,
      },
      depth: 0,
      overrideAccess: true,
    })) as Order

    return { order, recorded: true }
  } catch (error) {
    const raced = await findByCashKey(payload, cashKey)
    if (raced) return { order: raced, recorded: false }
    throw error
  }
}

export const cashOrderEndpoint: Endpoint = {
  handler: async (req) => {
    const prepared = await prepareCheckout(req, orderCashSchema)

    if (!prepared.ok) return prepared.response

    const { checkout, body } = prepared

    // Read on every request, so a page loaded before staff switched it off or
    // lowered the limit cannot get round the change.
    const settings = await req.payload.findGlobal({
      depth: 0,
      overrideAccess: true,
      slug: 'payment-settings',
    })

    if (!settings.codEnabled) {
      return Response.json({ message: COD_OFF, reason: 'cod-off' }, { status: 422 })
    }

    const max = typeof settings.codMaxTotal === 'number' ? settings.codMaxTotal : null

    if (max !== null && checkout.total > max) {
      return Response.json({ message: codLimitMessage(max), reason: 'cod-limit' }, { status: 422 })
    }

    let result: Awaited<ReturnType<typeof recordCashOrder>>

    try {
      result = await recordCashOrder(req.payload, checkout, body.cashKey)
    } catch (error) {
      req.payload.logger.error({ err: errorMessage(error), msg: 'cash_order_write_failed' })
      return json(ORDER_NOT_SAVED, 503)
    }

    // The same customer only: a key is not a way to read somebody else's order.
    if (String(result.order.customer) !== String(checkout.customer.id)) {
      return json(ORDER_NOT_SAVED, 409)
    }

    if (result.recorded) {
      const order = result.order
      req.payload.logger.info({
        lines: checkout.items.length,
        msg: 'cash_order_placed',
        order: order.id,
        total: checkout.total,
      })
      runAfterReply(async () => {
        try {
          await sendOrderMails(req.payload, order)
        } catch (error) {
          // A mail problem must never undo a placed order.
          req.payload.logger.error({ err: errorMessage(error), msg: 'order_mail_send_failed', order: order.id })
        }
      })
    }

    return Response.json(
      { orderId: result.order.id },
      { headers: { 'Set-Cookie': clearCartCookie() } },
    )
  },
  method: 'post',
  path: '/cash',
}
