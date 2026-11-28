import { randomUUID } from 'node:crypto'

import type { Endpoint } from 'payload'

import { clearCartCookie } from '@/utilities/cart'
import { isSameOriginPost } from '@/utilities/formPost'
import { runAfterReply } from '@/utilities/afterReply'
import {
  captureRazorpayPayment,
  createRazorpayOrder,
  fetchRazorpayOrder,
  fetchRazorpayPayment,
  isRazorpayConfigured,
  razorpayMode,
  verifyPaymentSignature,
} from '@/utilities/razorpay'

import { BAD_BODY, CROSS_SITE, endpointCustomer, json, prepareCheckout, readJson, SIGN_IN_FIRST } from './checkout'
import { recordPaidOrder } from './confirm'
import { findCheckoutIntent } from './intent'
import { orderVerifySchema } from './schema'
import { errorMessage } from '@/utilities/errorMessage'

/**
 * The two online-payment order endpoints (spec 0007). The checks before any
 * gateway order is opened live in checkout.ts, shared with the cash path.
 *
 * They are Payload collection endpoints, like the enquiry endpoint, but they
 * answer JSON instead of redirects: the browser needs values back (the gateway
 * order id, the amount, the key id) to open the Razorpay popup, and a plain
 * form redirect cannot carry those.
 *
 * Every money value is computed here from the basket and the live product
 * records. The cart cookie is a claim — a product slug and a duration label per
 * line — and every line is checked against the live product before a rupee is
 * used.
 *
 * No order row is written at checkout. A private intent keeps the verified
 * customer, delivery, and item snapshots until payment is confirmed.
 */

const NOT_CONFIGURED =
  'Online payment is not set up yet. Please message the kitchen to place your order.'
const PAYMENT_UNCONFIRMED =
  'We could not confirm this payment yet. If your bank debited the amount it usually settles within a few minutes, and the order will appear on your account page.'
const ORDER_NOT_SAVED = 'Your order could not be saved. Please try again.'

export const createOrderEndpoint: Endpoint = {
  handler: async (req) => {
    const prepared = await prepareCheckout(req)

    if (!prepared.ok) return prepared.response

    if (!isRazorpayConfigured()) {
      req.payload.logger.warn({ msg: 'order_create_not_configured' })
      return json(NOT_CONFIGURED, 503)
    }

    const { customer, delivery, items, total } = prepared.checkout

    let gateway

    try {
      gateway = await createRazorpayOrder(total, randomUUID())
    } catch (error) {
      req.payload.logger.error({
        err: errorMessage(error),
        msg: 'razorpay_order_create_failed',
      })
      return json('The payment gateway did not respond. Please try again in a moment.', 503)
    }

    if (
      gateway.currency !== 'INR' ||
      gateway.amount !== total ||
      !Number.isSafeInteger(gateway.amount)
    ) {
      req.payload.logger.error({
        gatewayOrderId: gateway.id,
        msg: 'razorpay_order_create_amount_mismatch',
      })
      return json('The payment could not be prepared. Please try again.', 503)
    }

    try {
      await req.payload.create({
        collection: 'checkout-intents',
        data: {
          customer: customer.id,
          delivery,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          gatewayOrderId: gateway.id,
          items,
          total,
        },
        depth: 0,
        overrideAccess: true,
      })
    } catch (error) {
      req.payload.logger.error({
        err: errorMessage(error),
        gatewayOrderId: gateway.id,
        msg: 'checkout_intent_save_failed',
      })
      return json('The checkout could not be saved. Please try again.', 503)
    }

    const mode = razorpayMode()
    req.payload.logger.info({ msg: 'order_started', mode, lines: items.length, total })

    return Response.json({
      amount: total,
      customer: { email: customer.email, name: delivery.name, phone: delivery.phone },
      gatewayOrderId: gateway.id,
      keyId: process.env.RAZORPAY_KEY_ID ?? '',
      mode,
    })
  },
  method: 'post',
  path: '/create',
}

export const verifyOrderEndpoint: Endpoint = {
  handler: async (req) => {
    if (!isSameOriginPost(req)) {
      req.payload.logger.warn({ msg: 'order_verify_cross_site_rejected' })
      return json(CROSS_SITE, 403)
    }

    const customer = await endpointCustomer(req)

    if (!customer) {
      return json(SIGN_IN_FIRST, 401)
    }

    const body = await readJson(req)
    const parsed = orderVerifySchema.safeParse(body ?? {})

    if (!parsed.success) {
      return json(BAD_BODY, 400)
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data

    if (
      !verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    ) {
      req.payload.logger.warn({ msg: 'order_return_signature_invalid' })
      return json(PAYMENT_UNCONFIRMED, 400)
    }

    const existing = await req.payload.find({
      collection: 'orders',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { gatewayOrderId: { equals: razorpay_order_id } },
    })
    const existingOrder = existing.docs[0]

    if (existingOrder) {
      const owner =
        typeof existingOrder.customer === 'object' && existingOrder.customer !== null
          ? existingOrder.customer.id
          : existingOrder.customer

      if (String(owner) !== String(customer.id)) {
        return json('That order could not be found.', 404)
      }

      return Response.json(
        { orderId: existingOrder.id, recorded: false, status: 'paid' },
        { headers: { 'Set-Cookie': clearCartCookie() } },
      )
    }

    let razorpayOrder

    try {
      razorpayOrder = await fetchRazorpayOrder(razorpay_order_id)
    } catch (error) {
      req.payload.logger.warn({
        err: errorMessage(error),
        msg: 'order_return_gateway_order_unreadable',
      })
      return json(PAYMENT_UNCONFIRMED, 400)
    }

    let payment

    try {
      payment = await fetchRazorpayPayment(razorpay_payment_id)
    } catch (error) {
      req.payload.logger.warn({
        err: errorMessage(error),
        msg: 'order_return_payment_fetch_failed',
      })
      return json(PAYMENT_UNCONFIRMED, 400)
    }

    let intent

    try {
      intent = await findCheckoutIntent(req.payload, razorpay_order_id)
    } catch (error) {
      req.payload.logger.error({
        err: errorMessage(error),
        gatewayOrderId: razorpay_order_id,
        msg: 'checkout_intent_read_failed',
      })
      return json(ORDER_NOT_SAVED, 500)
    }

    if (!intent || String(intent.customerId) !== String(customer.id)) {
      return json('That order could not be found.', 404)
    }

    if (
      razorpayOrder.id !== razorpay_order_id ||
      razorpayOrder.currency !== 'INR' ||
      payment.order_id !== razorpay_order_id ||
      !Number.isSafeInteger(payment.amount) ||
      payment.amount !== razorpayOrder.amount ||
      payment.currency !== 'INR' ||
      intent.total !== razorpayOrder.amount
    ) {
      req.payload.logger.warn({
        amount: payment.amount,
        currency: payment.currency,
        msg: 'order_return_payment_mismatch',
        status: payment.status,
      })
      return json(PAYMENT_UNCONFIRMED, 400)
    }

    // The popup returns as soon as the payment is authorized. Capture can lag
    // behind, or never come when the account does not capture on its own, so an
    // authorized payment whose amount matched above is captured here. When the
    // capture is refused, most often because Razorpay captured it meanwhile,
    // the payment is read again and judged on what it says now.
    if (payment.status === 'authorized') {
      try {
        payment = await captureRazorpayPayment(payment.id, payment.amount)
      } catch (error) {
        req.payload.logger.warn({
          err: errorMessage(error),
          msg: 'order_return_capture_failed',
        })

        try {
          payment = await fetchRazorpayPayment(razorpay_payment_id)
        } catch (refetchError) {
          req.payload.logger.warn({
            err: errorMessage(refetchError),
            msg: 'order_return_payment_fetch_failed',
          })
          return json(PAYMENT_UNCONFIRMED, 400)
        }
      }
    }

    if (
      payment.status !== 'captured' ||
      payment.id !== razorpay_payment_id ||
      payment.order_id !== razorpay_order_id ||
      payment.amount !== razorpayOrder.amount
    ) {
      req.payload.logger.warn({
        msg: 'order_return_payment_not_captured',
        status: payment.status,
      })
      return json(PAYMENT_UNCONFIRMED, 400)
    }

    let recorded

    try {
      // The browser is waiting on this answer to show the order page, so the
      // emails go once the reply has left.
      recorded = await recordPaidOrder(
        req.payload,
        {
          gatewayOrderId: razorpay_order_id,
          intent: { ...intent, total: payment.amount },
          payment: payment.details,
          paymentId: payment.id,
          signature: razorpay_signature,
        },
        { deferMail: runAfterReply },
      )
    } catch (error) {
      req.payload.logger.error({
        err: errorMessage(error),
        msg: 'order_return_write_failed',
      })
      return json(ORDER_NOT_SAVED, 500)
    }

    if (!recorded.order) {
      return json(ORDER_NOT_SAVED, 500)
    }

    return Response.json(
      {
        orderId: recorded.order.id,
        recorded: recorded.recorded,
        status: 'paid',
      },
      {
        // The payment is confirmed, so the basket is emptied whether this
        // return or the webhook wrote the row: a paid basket can never be
        // checked out twice.
        headers: { 'Set-Cookie': clearCartCookie() },
      },
    )
  },
  method: 'post',
  path: '/verify',
}
