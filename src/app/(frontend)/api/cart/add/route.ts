import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { addCartLine, cartCookie, readCartFromHeaders } from '@/utilities/cart'
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
 * never sends a price or a day count.
 */

export const dynamic = 'force-dynamic'

const back = (path: string, cookies: string[] = []): Response => seeOther(path, cookies)

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

  const duration = productDuration(product, durationLabel)

  if (!duration) return back('/cart?notice=changed')

  const cart = readCartFromHeaders(request.headers.get('cookie'))
  const result = addCartLine(cart, { duration: duration.label, product: product.slug })

  if (!result.ok) {
    return back(`/cart?notice=${result.reason === 'duplicate' ? 'duplicate' : 'full'}`)
  }

  return back(returnPath, [cartCookie(result.lines)])
}
