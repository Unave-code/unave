import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { fetchRazorpayOrder, verifyWebhookSignature } from '@/utilities/razorpay'

import { recordPaidOrder } from '@/collections/Orders/confirm'
import { findCheckoutIntent } from '@/collections/Orders/intent'

/**
 * Razorpay's webhook (spec 0007, AC-6).
 *
 * This is the second of the two payment signals, and the one that matters when
 * the browser never comes back: it writes the paid order itself, from the
 * private checkout intent stored by Unave. The signature is
 * checked over the raw request bytes before anything is parsed, because
 * re-serialized JSON can differ in whitespace and a crafted body could exploit
 * that. Only a `payment.captured` event for an amount that matches both the
 * gateway order and its intent writes a row, and every answer is idempotent: a
 * replayed webhook finds the order already recorded and answers 200.
 */

type PaymentEntity = {
  amount?: unknown
  currency?: unknown
  id?: unknown
  order_id?: unknown
  status?: unknown
}

type OrderEntity = {
  amount?: unknown
  currency?: unknown
  id?: unknown
}

type WebhookEvent = {
  event?: unknown
  payload?: {
    order?: { entity?: OrderEntity }
    payment?: PaymentEntity & { entity?: PaymentEntity }
  }
}

/**
 * Razorpay wraps each payload entry in an `entity` object, so a real delivery
 * puts the payment at `payload.payment.entity`. The flat shape stays accepted
 * for hand built calls and the tests that predate this fix.
 */
const paymentEntity = (event: WebhookEvent): PaymentEntity | null => {
  const payment = event.payload?.payment

  return payment?.entity ?? payment ?? null
}

const paymentCaptured = (
  event: WebhookEvent,
): { paymentId: string; orderId: string } | null => {
  if (event.event !== 'payment.captured') return null

  const payment = paymentEntity(event)

  if (!payment || typeof payment.id !== 'string' || typeof payment.order_id !== 'string') {
    return null
  }

  if (payment.status !== 'captured') return null

  return { orderId: payment.order_id, paymentId: payment.id }
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''

  const payload = await getPayload({ config: configPromise })

  if (!verifyWebhookSignature(rawBody, signature)) {
    payload.logger.warn({ msg: 'razorpay_webhook_signature_invalid' })
    return new Response('Signature did not match.', { status: 400 })
  }

  let event: WebhookEvent

  try {
    event = JSON.parse(rawBody) as WebhookEvent
  } catch {
    // Signed but unreadable: acknowledge it so Razorpay stops retrying, and log
    // it, because a body we cannot read is worth knowing about.
    payload.logger.warn({ msg: 'razorpay_webhook_body_unreadable' })
    return new Response('Event acknowledged.', { status: 200 })
  }

  const captured = paymentCaptured(event)

  if (!captured) {
    // Any other event is not ours to act on, but it was delivered correctly.
    return new Response('Event acknowledged.', { status: 200 })
  }

  const found = await payload.find({
    collection: 'orders',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { gatewayOrderId: { equals: captured.orderId } },
  })

  if (found.docs[0]) {
    // A replay, or the browser return got here first. Recorded is recorded.
    return new Response('Event acknowledged.', { status: 200 })
  }

  const orderEntity = event.payload?.order?.entity

  let gatewayOrder: { amount: number; currency: string; id: string } | null = null

  if (
    orderEntity &&
    typeof orderEntity.amount === 'number' &&
    typeof orderEntity.currency === 'string' &&
    typeof orderEntity.id === 'string' &&
    orderEntity.id === captured.orderId
  ) {
    gatewayOrder = {
      amount: orderEntity.amount,
      currency: orderEntity.currency,
      id: orderEntity.id,
    }
  } else {
    try {
      const order = await fetchRazorpayOrder(captured.orderId)
      gatewayOrder = { amount: order.amount, currency: order.currency, id: order.id }
    } catch (error) {
      payload.logger.warn({
        err: error instanceof Error ? error.message : String(error),
        msg: 'razorpay_webhook_order_unreadable',
        order: captured.orderId,
      })
      return new Response('Gateway order could not be read.', { status: 500 })
    }
  }

  if (!gatewayOrder) {
    payload.logger.error({
      gatewayOrderId: captured.orderId,
      msg: 'razorpay_webhook_order_missing',
    })
    return new Response('Gateway order could not be read.', { status: 500 })
  }

  let intent

  try {
    intent = await findCheckoutIntent(payload, captured.orderId)
  } catch (error) {
    payload.logger.error({
      err: error instanceof Error ? error.message : String(error),
      gatewayOrderId: captured.orderId,
      msg: 'razorpay_webhook_intent_read_failed',
      paymentId: captured.paymentId,
    })
    return new Response('Event acknowledged.', { status: 500 })
  }

  if (!intent) {
    payload.logger.warn({
      gatewayOrderId: captured.orderId,
      msg: 'razorpay_webhook_intent_missing',
      paymentId: captured.paymentId,
      status: paymentEntity(event)?.status,
    })
    return new Response('Event acknowledged.', { status: 200 })
  }

  // The webhook's payment payload is the honest amount, and it must match both
  // the gateway order and the intent before anything is written.
  const payment = paymentEntity(event)
  const amount = typeof payment?.amount === 'number' ? payment.amount : null
  const currency = typeof payment?.currency === 'string' ? payment.currency : null

  if (
    amount === null ||
    !Number.isSafeInteger(amount) ||
    currency !== 'INR' ||
    payment?.order_id !== captured.orderId ||
    gatewayOrder.id !== captured.orderId ||
    gatewayOrder.currency !== 'INR' ||
    amount !== gatewayOrder.amount ||
    amount !== intent.total
  ) {
    payload.logger.warn({
      amount,
      currency,
      msg: 'razorpay_webhook_amount_mismatch',
      order: captured.orderId,
    })
    return new Response('Event acknowledged.', { status: 200 })
  }

  try {
    const { order, recorded } = await recordPaidOrder(payload, {
      gatewayOrderId: captured.orderId,
      intent: { ...intent, total: amount },
      paymentId: captured.paymentId,
      signature,
    })

    payload.logger.info({
      msg: 'razorpay_webhook_handled',
      order: order?.id ?? captured.orderId,
      recorded,
    })
  } catch (error) {
    payload.logger.error({
      err: error instanceof Error ? error.message : String(error),
      msg: 'razorpay_webhook_write_failed',
      order: captured.orderId,
    })
  }

  return new Response('Event acknowledged.', { status: 200 })
}
