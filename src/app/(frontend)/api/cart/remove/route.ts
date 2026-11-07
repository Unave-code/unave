import {
  cartCookie,
  cartLineKey,
  decodeCartLine,
  readCartFromHeaders,
  removeCartLine,
} from '@/utilities/cart'
import { isSameOriginRequest, safeReturnPath, seeOther } from '@/utilities/formPost'

/**
 * Removing one line from the cart (spec 0007, AC-3).
 *
 * A plain form post, so managing the basket works without JavaScript. The line
 * travels as a two element JSON array (product slug, duration label), the cookie
 * is rewritten without it, and the browser returns to the cart. Removing the
 * last line leaves an empty cookie, which the page reads back as an empty cart.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) return seeOther('/cart')

  const form = await request.formData().catch(() => null)
  const rawLine = String(form?.get('line') ?? '').slice(0, 400)
  const returnPath = safeReturnPath(form?.get('return')) ?? '/cart'
  const cart = readCartFromHeaders(request.headers.get('cookie'))
  const line = decodeCartLine(rawLine)
  const next = line ? removeCartLine(cart, cartLineKey(line)) : cart

  return seeOther(returnPath, [cartCookie(next)])
}
