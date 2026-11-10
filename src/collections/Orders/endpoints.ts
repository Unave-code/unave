import { randomUUID } from 'node:crypto'

import type { Endpoint, PayloadRequest } from 'payload'

import { authenticateCustomerToken } from '@/auth/customerSession'
import {
  CART_COOKIE,
  CART_MAX_LINES,
  clearCartCookie,
  hasDuplicateCartLines,
  normalizeCartLines,
  parseCartEntries,
} from '@/utilities/cart'
import { resolveCartLines } from '@/utilities/cartLines'
import { CUSTOMER_SESSION_COOKIE, readCookie } from '@/utilities/customerSession'
import { isSameOriginPost } from '@/utilities/formPost'
import { checkOrderIpLimit, getClientIp } from '@/utilities/rateLimit'
import {
  createRazorpayOrder,
  fetchRazorpayOrder,
  fetchRazorpayPayment,
  isRazorpayConfigured,
  razorpayMode,
  verifyPaymentSignature,
} from '@/utilities/razorpay'

import { recordPaidOrder } from './confirm'
import { buildOrderNotes, readOrderNotes } from './intent'
import { orderCreateSchema, orderVerifySchema } from './schema'

/**
 * The two order endpoints (spec 0007).
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
 * No order row is written at checkout. The lines, their prices and days, and the
 * delivery details ride on the Razorpay order's notes, so a row can be written
 * the moment a payment is captured, whether that signal comes from the browser's
 * return or from the signed webhook. An abandoned checkout therefore leaves
 * nothing behind, and a row in Orders always means one completed payment.
 */

const readJson = async (req: PayloadRequest): Promise<Record<string, unknown> | null> => {
  try {
    const body = await req.json?.()
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/** The signed in customer for an endpoint request, verified through Payload's strategy. */
const endpointCustomer = async (req: PayloadRequest) => {
  const token = readCookie(req.headers.get('cookie'), CUSTOMER_SESSION_COOKIE)

  return authenticateCustomerToken(req.payload, token, req)
}

const CROSS_SITE = 'Your session could not be verified. Please try again.'
const SIGN_IN_FIRST = 'Please sign in to place your order.'
const SLOW_DOWN = 'That was too many attempts. Please wait a bit and try again.'
const NOT_CONFIGURED =
  'Online payment is not set up yet. Please message the kitchen to place your order.'
const BAD_BODY = 'Something in the order did not read correctly. Please try again.'
const EMPTY_BASKET = 'Your cart is empty. Add a product before checking out.'
const TOO_MANY = 'A cart holds at most ten products. Remove one before checking out.'
const DUPLICATE_LINES =
  'Your cart has the same product and duration twice. Remove one before checking out.'
const BASKET_CHANGED =
  'One of the products in your cart has changed or left the menu. Please review your cart and try again.'
const PAYMENT_UNCONFIRMED =
  'We could not confirm this payment yet. If your bank debited the amount it usually settles within a few minutes, and the order will appear on your account page.'
const ORDER_NOT_SAVED = 'Your order could not be saved. Please try again.'

const json = (message: string, status: number): Response => Response.json({ message }, { status })

export const createOrderEndpoint: Endpoint = {
  handler: async (req) => {
    if (!isSameOriginPost(req)) {
      req.payload.logger.warn({ msg: 'order_create_cross_site_rejected' })
      return json(CROSS_SITE, 403)
    }

    const customer = await endpointCustomer(req)

    if (!customer) {
      return json(SIGN_IN_FIRST, 401)
    }

    if (checkOrderIpLimit(getClientIp(req.headers)).limited) {
      return json(SLOW_DOWN, 429)
    }

    if (!isRazorpayConfigured()) {
      req.payload.logger.warn({ msg: 'order_create_not_configured' })
      return json(NOT_CONFIGURED, 503)
    }

    const body = await readJson(req)
    const parsed = orderCreateSchema.safeParse(body ?? {})

    if (!parsed.success) {
      return json(parsed.error.issues[0]?.message ?? BAD_BODY, 422)
    }

    const { delivery, note } = parsed.data

    // The lines come from the cart cookie read on the server, never from the
    // request body. Every price and day count is resolved here from the live
    // product records, so no browser value can decide an amount.
    const payload = req.payload
    const entries = parseCartEntries(readCookie(req.headers.get('cookie'), CART_COOKIE))

    if (entries.length === 0) return json(EMPTY_BASKET, 422)
    if (entries.length > CART_MAX_LINES) return json(TOO_MANY, 422)
    if (hasDuplicateCartLines(entries)) return json(DUPLICATE_LINES, 422)

    const cart = await resolveCartLines({ lines: normalizeCartLines(entries), payload })

    if (cart.stale.length > 0 || cart.usable.length === 0) {
      return json(BASKET_CHANGED, 422)
    }

    const items = cart.usable.map((line) => ({
      days: line.days ?? 0,
      durationLabel: line.duration,
      productId: line.productId ?? 0,
      productTitle: line.productTitle,
      unitPrice: line.price ?? 0,
    }))

    // The whole checkout intent rides on the gateway order, so either payment
    // signal can write the paid row later. Nothing is written here.
    const notes = buildOrderNotes({
      customerId: customer.id,
      delivery: {
        city: delivery.city,
        line1: delivery.line1,
        line2: delivery.line2,
        name: delivery.name,
        phone: delivery.phone,
        pincode: delivery.pincode,
        state: delivery.state,
      },
      items,
      note,
    })

    let gateway

    try {
      gateway = await createRazorpayOrder(cart.total, randomUUID(), notes)
    } catch (error) {
      req.payload.logger.error({
        err: error instanceof Error ? error.message : String(error),
        msg: 'razorpay_order_create_failed',
      })
      return json('The payment gateway did not respond. Please try again in a moment.', 503)
    }

    const mode = razorpayMode()
    req.payload.logger.info({ msg: 'order_started', mode, lines: items.length, total: cart.total })

    return Response.json({
      amount: cart.total,
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

    // The product and the delivery live on the gateway order, not in a local row.
    let razorpayOrder

    try {
      razorpayOrder = await fetchRazorpayOrder(razorpay_order_id)
    } catch (error) {
      req.payload.logger.warn({
        err: error instanceof Error ? error.message : String(error),
        msg: 'order_return_gateway_order_unreadable',
      })
      return json(PAYMENT_UNCONFIRMED, 400)
    }

    const intent = readOrderNotes(razorpayOrder.notes)

    // A 404 rather than a 403: the answer must not confirm that somebody else's
    // payment exists under that id.
    if (!intent || String(intent.customerId) !== String(customer.id)) {
      return json('That order could not be found.', 404)
    }

    let payment

    try {
      payment = await fetchRazorpayPayment(razorpay_payment_id)
    } catch (error) {
      req.payload.logger.warn({
        err: error instanceof Error ? error.message : String(error),
        msg: 'order_return_payment_fetch_failed',
      })
      return json(PAYMENT_UNCONFIRMED, 400)
    }

    if (
      payment.status !== 'captured' ||
      payment.order_id !== razorpay_order_id ||
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

    let recorded

    try {
      recorded = await recordPaidOrder(req.payload, {
        gatewayOrderId: razorpay_order_id,
        intent: { ...intent, total: payment.amount },
        paymentId: payment.id,
        signature: razorpay_signature,
      })
    } catch (error) {
      req.payload.logger.error({
        err: error instanceof Error ? error.message : String(error),
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
