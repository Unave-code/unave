import configPromise from '@payload-config'
import { getPayload } from 'payload'

import {
  addCartLine,
  addOneTimeCartLine,
  cartCookie,
  ONE_TIME_DURATION,
  readCartFromHeaders,
} from '@/utilities/cart'
import { productDuration } from '@/utilities/cartLines'
import { isSameOriginRequest, safeReturnPath, seeOther } from '@/utilities/formPost'

/**
 * Adding one line to the cart (spec 0007, AC-2).
 *
 * A plain form post, so it works with JavaScript off: the card submits a product
 * slug and the chosen duration label, this route resolves both against the live
 * record, writes the identifiers into the cookie, and redirects back to the
 * shelf the customer was reading. A duplicate, a full basket, a paused product
 * or a duration that left the menu each redirect to the cart with one plain
 * sentence, never an error page.
 *
 * The product record decides whether a line may enter the basket; the browser
 * never sends a price or a day count. For a one-time product — sold without
 * durations — the form carries the reserved one-time duration and the route
 * adds through the quantity-aware adder, so adding what is already there bumps
 * the quantity instead of being refused as a duplicate.
 */

export const dynamic = 'force-dynamic'

const back = (path: string, cookies: string[] = []): Response => seeOther(path, cookies)

const noticeBack = (reason: 'duplicate' | 'full' | 'quantity'): Response =>
  back(`/cart?notice=${reason}`)

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) return back('/cart?notice=unknown')

  const form = await request.formData().catch(() => null)

  if (!form) return back('/cart?notice=unknown')

  const productSlug = String(form.get('product') ?? '')
    .trim()
    .slice(0, 120)
  const durationLabel = String(form.get('duration') ?? '')
    .trim()
    .slice(0, 80)
  const returnPath = safeReturnPath(form.get('return')) ?? '/products'

  if (!productSlug || !durationLabel) return back('/cart?notice=unknown')

  const payload = await getPayload({ config: configPromise })
  const found = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 1,
    where: { slug: { equals: productSlug } },
  })

  const product = found.docs[0]

  if (!product) return back('/cart?notice=unknown')
  if (!product.available) return back('/cart?notice=paused')

  const cart = readCartFromHeaders(request.headers.get('cookie'))

  // A one-time product has no durations to choose: its line carries the
  // reserved duration label exactly, and the quantity carries the rest.
  if (product.type === 'one-time') {
    if (durationLabel !== ONE_TIME_DURATION) return back('/cart?notice=changed')

    const result = addOneTimeCartLine(cart, product.slug)

    return result.ok ? back(returnPath, [cartCookie(result.lines)]) : noticeBack(result.reason)
  }

  const duration = productDuration(product, durationLabel)

  if (!duration) return back('/cart?notice=changed')

  const result = addCartLine(cart, { duration: duration.label, product: product.slug })

  if (!result.ok) return noticeBack(result.reason)

  return back(returnPath, [cartCookie(result.lines)])
}
