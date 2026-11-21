import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { CART_MAX_LINES, cartCookie, readCartFromHeaders, sameCartLine } from '@/utilities/cart'
import { isSameOriginRequest, seeOther } from '@/utilities/formPost'
import {
  encodePlanSelection,
  MEAL_PLANS_PATH,
  mealPlanLineProduct,
  mealPlanPath,
  normalizeMealPlan,
  PLAN_SLOTS,
  type PlanSelection,
  type PlanSlot,
  pricePlanSelection,
} from '@/utilities/planBuilder'

/**
 * Adding a built meal plan to the cart (/meal-subscription/<slug>).
 *
 * A plain form post: the meal plan, meals, plan length, people and one choice
 * per option group. Every choice is checked against the meal plan before the identifiers go into the cookie. A cart can hold
 * several built plans, of the same meal plan or different ones; building the
 * exact same plan again keeps the one line. No price travels: the cart, checkout
 * and order endpoint price each line again on the server.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null)
  const slug = String(form?.get('mealPlan') ?? '').trim().slice(0, 100)
  const back = slug ? mealPlanPath(slug) : MEAL_PLANS_PATH

  if (!isSameOriginRequest(request) || !form || !slug) return seeOther(`${back}?notice=unknown`)

  const payload = await getPayload({ config: configPromise })
  const found = await payload.find({ collection: 'meal-plans', depth: 1, limit: 1, where: { slug: { equals: slug } } })
  const doc = found.docs[0]
  if (!doc) return seeOther(`${MEAL_PLANS_PATH}?notice=changed`)

  const data = normalizeMealPlan(doc)
  const slot = String(form.get('slot') ?? '') as PlanSlot
  const selection: PlanSelection = {
    // Every picked add-on in a group arrives as its own choice-<group> field; none is fine.
    choices: data.optionGroups.map((_, i) =>
      form
        .getAll(`choice-${i}`)
        .slice(0, 20)
        .map((v) => Number.parseInt(String(v), 10)),
    ),
    people: Number.parseInt(String(form.get('people') ?? '1'), 10),
    plan: String(form.get('plan') ?? '').trim().slice(0, 40),
    slot,
  }

  if (!PLAN_SLOTS.includes(slot) || !pricePlanSelection(data, selection)) {
    return seeOther(`${back}?notice=changed`)
  }

  const line = { duration: encodePlanSelection(selection), product: mealPlanLineProduct(doc.slug), qty: 1 }
  const cart = readCartFromHeaders(request.headers.get('cookie'))

  if (!cart.some((existing) => sameCartLine(existing, line))) {
    if (cart.length >= CART_MAX_LINES) return seeOther('/cart?notice=full')
    cart.push(line)
  }

  return seeOther('/cart', [cartCookie(cart)])
}
