import {
  cartCookie,
  cartLineKey,
  CART_MAX_QTY,
  decodeCartLine,
  readCartFromHeaders,
} from '@/utilities/cart'
import { isSameOriginRequest, safeReturnPath, seeOther } from '@/utilities/formPost'

/**
 * Stepping one line's quantity up or down (the one-time products build).
 *
 * A plain form post with two submit buttons — `delta` −1 and `delta` +1 — so
 * the steppers on the cart page work without JavaScript. The line travels as
 * the same two element JSON array the remove route takes; the quantity itself
 * never rides the form, because the cookie is the only place it lives. The
 * new quantity is clamped between one and the cap, so no posted value can
 * push a line past what the order endpoint would accept, and a step on a line
 * the cart does not hold rewrites the cookie unchanged.
 *
 * The route never reads the database: the cookie is the whole truth about
 * quantities, and every price is still resolved later, on the server.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) return seeOther('/cart')

  const form = await request.formData().catch(() => null)
  const rawLine = String(form?.get('line') ?? '').slice(0, 400)
  const delta = Number(form?.get('delta'))
  const returnPath = safeReturnPath(form?.get('return')) ?? '/cart'
  const line = decodeCartLine(rawLine)

  if ((delta !== 1 && delta !== -1) || !line) return seeOther(returnPath)

  const key = cartLineKey(line)
  const cart = readCartFromHeaders(request.headers.get('cookie'))

  const next = cart.map((entry) =>
    cartLineKey(entry) === key
      ? { ...entry, qty: Math.min(CART_MAX_QTY, Math.max(1, entry.qty + delta)) }
      : entry,
  )

  return seeOther(returnPath, [cartCookie(next)])
}
