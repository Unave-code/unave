import type { PayloadRequest } from 'payload'
import type { z } from 'zod'

import { authenticateCustomerToken } from '@/auth/customerSession'
import type { CheckoutIntent, Customer } from '@/payload-types'
import {
  CART_COOKIE,
  CART_MAX_LINES,
  hasDuplicateCartLines,
  isValidCartQuantity,
  normalizeCartLines,
  parseCartEntries,
} from '@/utilities/cart'
import { resolveCartLines } from '@/utilities/cartLines'
import { CUSTOMER_SESSION_COOKIE, readCookie } from '@/utilities/customerSession'
import { deliveryCheck } from '@/utilities/deliveryArea'
import { CHECKOUT_PINCODE_NOT_SERVED } from '@/utilities/deliveryAreaCopy'
import { isSameOriginPost } from '@/utilities/formPost'
import { checkOrderIpLimit, getClientIp } from '@/utilities/rateLimit'

import type { OrderIntent } from './intent'
import { orderCreateSchema } from './schema'

/**
 * The checks every way of placing an order runs before anything is written
 * (spec 0007, and the cash on delivery spec of 2026-11-28). The online path
 * opens a gateway order afterwards; the cash path writes the order straight
 * away. Keeping the checks here means the two can never disagree about who may
 * order, where the kitchen delivers, or what a basket costs.
 *
 * Every money value is computed from the cart cookie and the live product
 * records. The cookie is a claim — a product slug and a duration label per
 * line — and every line is checked against the live product before a rupee is
 * used. Nothing priced ever arrives from the request body.
 */

export const CROSS_SITE = 'Your session could not be verified. Please try again.'
export const SIGN_IN_FIRST = 'Please sign in to place your order.'
export const SLOW_DOWN = 'That was too many attempts. Please wait a bit and try again.'
export const BAD_BODY = 'Something in the order did not read correctly. Please try again.'
export const EMPTY_BASKET = 'Your cart is empty. Add a product before checking out.'
export const TOO_MANY = 'A cart holds at most ten products. Remove one before checking out.'
export const DUPLICATE_LINES =
  'Your cart has the same product and duration twice. Remove one before checking out.'
export const BAD_QUANTITY =
  'One of the products in your cart has a quantity we cannot deliver. Please review your cart and try again.'
export const BASKET_CHANGED =
  'One of the products in your cart has changed or left the menu. Please review your cart and try again.'

export const json = (message: string, status: number): Response =>
  Response.json({ message }, { status })

export const readJson = async (req: PayloadRequest): Promise<Record<string, unknown> | null> => {
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
export const endpointCustomer = async (req: PayloadRequest) => {
  const token = readCookie(req.headers.get('cookie'), CUSTOMER_SESSION_COOKIE)

  return authenticateCustomerToken(req.payload, token, req)
}

export type PreparedCheckout = {
  customer: Customer
  /** Already in the order's own field names, the note included. */
  delivery: OrderIntent['delivery']
  /** The snapshot rows, in the shape the intent and the order both store. */
  items: CheckoutIntent['items']
  /** Paise. */
  total: number
}

export type PrepareCheckoutResult<Body> =
  | { body: Body; checkout: PreparedCheckout; ok: true }
  | { ok: false; response: Response }

const refuse = (response: Response) => ({ ok: false as const, response })

export async function prepareCheckout(
  req: PayloadRequest,
): Promise<PrepareCheckoutResult<z.infer<typeof orderCreateSchema>>>
export async function prepareCheckout<Schema extends typeof orderCreateSchema>(
  req: PayloadRequest,
  bodySchema: Schema,
): Promise<PrepareCheckoutResult<z.infer<Schema>>>
export async function prepareCheckout(
  req: PayloadRequest,
  bodySchema: typeof orderCreateSchema = orderCreateSchema,
): Promise<PrepareCheckoutResult<z.infer<typeof orderCreateSchema>>> {
  if (!isSameOriginPost(req)) {
    req.payload.logger.warn({ msg: 'order_create_cross_site_rejected' })
    return refuse(json(CROSS_SITE, 403))
  }

  const customer = await endpointCustomer(req)

  if (!customer) return refuse(json(SIGN_IN_FIRST, 401))

  if (checkOrderIpLimit(getClientIp(req.headers)).limited) {
    return refuse(json(SLOW_DOWN, 429))
  }

  const body = await readJson(req)
  const parsed = bodySchema.safeParse(body ?? {})

  if (!parsed.success) {
    return refuse(json(parsed.error.issues[0]?.message ?? BAD_BODY, 422))
  }

  const { delivery, note } = parsed.data

  // The delivery area is checked here, before anything is written or a gateway
  // order exists, and never again after: once an order is placed it stands even
  // if staff change the list in between.
  const areas = await req.payload.findGlobal({ depth: 0, overrideAccess: true, slug: 'delivery-areas' })

  if (deliveryCheck(areas, delivery.pincode) === 'not-served') {
    req.payload.logger.info({ msg: 'order_create_pincode_not_served', pincode: delivery.pincode })
    return refuse(
      Response.json(
        { message: CHECKOUT_PINCODE_NOT_SERVED, reason: 'pincode-not-served' },
        { status: 422 },
      ),
    )
  }

  const entries = parseCartEntries(readCookie(req.headers.get('cookie'), CART_COOKIE))

  if (entries.length === 0) return refuse(json(EMPTY_BASKET, 422))
  if (entries.length > CART_MAX_LINES) return refuse(json(TOO_MANY, 422))
  if (hasDuplicateCartLines(entries)) return refuse(json(DUPLICATE_LINES, 422))
  // Quantities ride the cookie raw, so a tampered one is refused outright
  // rather than clamped into an order the customer never saw.
  if (entries.some((entry) => !isValidCartQuantity(entry.qty))) {
    return refuse(json(BAD_QUANTITY, 422))
  }

  const cart = await resolveCartLines({ lines: normalizeCartLines(entries), payload: req.payload })

  if (cart.stale.length > 0 || cart.usable.length === 0) {
    return refuse(json(BASKET_CHANGED, 422))
  }

  const items: CheckoutIntent['items'] = cart.usable.map((line) => ({
    // A snapshot of the ticked extras; unitPrice below already includes them.
    addons: line.addons.map((addon) => ({
      addonId: addon.id,
      addonRef: addon.id,
      price: addon.price,
      title: addon.title,
    })),
    basePrice: line.basePrice ?? line.price ?? 0,
    components: line.components?.map((component) => ({
      days: component.days,
      durationLabel: component.durationLabel,
      productId: component.product,
      productRef: component.product,
      productTitle: component.productTitle,
    })),
    days: line.days ?? 0,
    // A built plan has no product record: its line names its choices instead.
    durationLabel: line.detail ?? line.duration,
    productId: line.productId === null ? null : Number(line.productId),
    productRef: line.productId === null ? null : Number(line.productId),
    productTitle: line.productTitle,
    qty: line.qty,
    unitPrice: line.price ?? 0,
  }))

  return {
    body: parsed.data,
    checkout: {
      customer: customer as Customer,
      delivery: {
        addressLine1: delivery.line1,
        addressLine2: delivery.line2,
        city: delivery.city,
        foodPreference: delivery.foodPreference,
        name: delivery.name,
        note,
        phone: delivery.phone,
        pincode: delivery.pincode,
        state: delivery.state,
      },
      items,
      total: cart.total,
    },
    ok: true,
  }
}
