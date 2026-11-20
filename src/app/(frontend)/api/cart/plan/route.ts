import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { CART_MAX_LINES, cartCookie, readCartFromHeaders } from '@/utilities/cart'
import { isSameOriginRequest, seeOther } from '@/utilities/formPost'
import {
  encodePlanSelection,
  normalizePlanBuilder,
  PLAN_BUILDER_PATH,
  PLAN_BUILDER_SLUG,
  PLAN_SLOTS,
  type PlanSelection,
  type PlanSlot,
  pricePlanSelection,
} from '@/utilities/planBuilder'

/**
 * Adding a built plan to the cart (the /meal-subscription page).
 *
 * A plain form post: meals, plan length, people and one choice per option
 * group. The route checks every choice against the plan builder global and
 * only then writes the identifiers into the cookie, replacing any plan built
 * earlier, so a cart holds one built plan at a time. No price travels: the cart,
 * checkout and order endpoint price the line again from the global.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) return seeOther(`${PLAN_BUILDER_PATH}?notice=unknown`)

  const form = await request.formData().catch(() => null)
  if (!form) return seeOther(`${PLAN_BUILDER_PATH}?notice=unknown`)

  const payload = await getPayload({ config: configPromise })
  const data = normalizePlanBuilder(await payload.findGlobal({ slug: 'plan-builder', depth: 0 }))

  const slot = String(form.get('slot') ?? '') as PlanSlot
  const selection: PlanSelection = {
    choices: data.optionGroups.map((_, i) => Number.parseInt(String(form.get(`choice-${i}`) ?? '0'), 10)),
    people: Number.parseInt(String(form.get('people') ?? '1'), 10),
    plan: String(form.get('plan') ?? '').trim().slice(0, 40),
    slot,
  }

  if (!PLAN_SLOTS.includes(slot) || !pricePlanSelection(data, selection)) {
    return seeOther(`${PLAN_BUILDER_PATH}?notice=changed`)
  }

  const others = readCartFromHeaders(request.headers.get('cookie')).filter(
    (line) => line.product !== PLAN_BUILDER_SLUG,
  )

  if (others.length >= CART_MAX_LINES) return seeOther('/cart?notice=full')

  const lines = [...others, { duration: encodePlanSelection(selection), product: PLAN_BUILDER_SLUG, qty: 1 }]
  const next = form.get('buyNow') === 'true' ? '/checkout' : '/cart'

  return seeOther(next, [cartCookie(lines)])
}
