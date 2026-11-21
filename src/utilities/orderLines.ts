import type { Order } from '@/payload-types'

import { ONE_TIME_DURATION } from './cart'
import { isOneTimeOrderItem } from './orderDisplay'
import { relationId } from './relationId'

/**
 * How the admin order page reads each stored order line (design:
 * docs/superpowers/specs/2026-11-21-admin-order-detail-design.md).
 *
 * An order keeps a snapshot, never a live product. A built meal subscription
 * has no product record at all: its title is "Meal plan: <title>" and its label
 * folds the meal, the length, the people and every pick into one string,
 * "meal · length · people · pick · pick…", written by `pricePlanSelection`. This
 * module takes that label apart again and, given the meal plan as it stands
 * now, puts each pick back under the option group it came from. When the plan
 * has changed since the order, the picks stay a plain list rather than being
 * guessed into the wrong group.
 */

export type OrderItemLike = Omit<NonNullable<Order['items']>[number], 'components'> & {
  components?: { product?: unknown; productTitle?: null | string }[] | null
}

/** One meal plan's option groups as they stand now, by choice label. */
export type PlanGroups = { title: string; choices: string[] }[]

export type PlanLookup = { groups: PlanGroups; trialLengths: string[] }

export type PickGroup = { title: string; picks: string[] }

export type OrderLineView =
  | { kind: 'item'; title: string; qty: number; unitPrice: number; lineTotal: number; size: null | string; productId: null | number }
  | { kind: 'combo'; title: string; qty: number; unitPrice: number; lineTotal: number; includes: string[]; productId: null | number }
  | { kind: 'plan'; title: string; duration: string; days: number; lineTotal: number; perDay: number; productId: null | number }
  | {
      kind: 'subscription'
      title: string
      meal: string
      length: string
      days: number
      people: string
      trial: boolean
      groups: null | PickGroup[]
      picks: string[]
      lineTotal: number
      perDay: number
    }
  | { kind: 'unknown'; title: string; detail: string; lineTotal: number }

export const MEAL_PLAN_TITLE_PREFIX = 'Meal plan: '

const SEPARATOR = ' · '

/** The meal plan a built subscription line names, or null for any other line. */
export function mealPlanTitle(productTitle: null | string | undefined): null | string {
  if (!productTitle?.startsWith(MEAL_PLAN_TITLE_PREFIX)) return null
  return productTitle.slice(MEAL_PLAN_TITLE_PREFIX.length).trim() || null
}

export function parseSubscriptionLabel(
  label: string,
): null | { meal: string; length: string; people: string; picks: string[] } {
  const parts = label
    .split(SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length < 3) return null
  const [meal, length, people, ...picks] = parts
  return { meal, length, people, picks }
}

/**
 * The picks under their groups, in the plan's group order, or null when any
 * pick no longer matches a choice. The label lists picks group by group, so a
 * pick never belongs to a group before the previous pick's: a label two groups
 * share goes to the first group at or after that point that offers it.
 */
export function groupPicks(picks: string[], groups: PlanGroups): null | PickGroup[] {
  const placed: string[][] = groups.map(() => [])
  let from = 0

  for (const pick of picks) {
    const index = groups.findIndex((group, i) => i >= from && group.choices.includes(pick) && !placed[i].includes(pick))
    if (index === -1) return null
    placed[index].push(pick)
    from = index
  }

  return groups.flatMap((group, i) => (placed[i].length > 0 ? [{ title: group.title, picks: placed[i] }] : []))
}

const quantity = (qty: unknown): number => (typeof qty === 'number' && Number.isInteger(qty) && qty >= 1 ? qty : 1)

const productIdOf = (product: unknown): null | number => {
  const id = relationId(product)
  const number = typeof id === 'number' ? id : Number(id)
  return id !== null && Number.isSafeInteger(number) ? number : null
}

export function describeOrderLine(item: OrderItemLike, lookup?: null | PlanLookup): OrderLineView {
  const qty = quantity(item.qty)
  const unitPrice = Number(item.unitPrice ?? 0)
  const lineTotal = unitPrice * qty
  const days = Number(item.days ?? 0)
  const label = item.durationLabel?.trim() ?? ''
  const productId = productIdOf(item.product)
  const planTitle = productId === null ? mealPlanTitle(item.productTitle) : null

  if (planTitle !== null) {
    const parsed = parseSubscriptionLabel(label)
    if (!parsed) return { kind: 'unknown', title: planTitle, detail: label, lineTotal }

    const trial = lookup
      ? lookup.trialLengths.some((length) => length.toLowerCase() === parsed.length.toLowerCase())
      : /trial/i.test(parsed.length)

    return {
      kind: 'subscription',
      title: planTitle,
      meal: parsed.meal,
      length: parsed.length,
      days,
      people: parsed.people,
      trial,
      groups: lookup ? groupPicks(parsed.picks, lookup.groups) : null,
      picks: parsed.picks,
      lineTotal,
      perDay: days > 0 ? Math.round(lineTotal / days) : 0,
    }
  }

  const title = item.productTitle?.trim() || 'Product'

  if (item.components?.length) {
    return {
      kind: 'combo',
      title,
      qty,
      unitPrice,
      lineTotal,
      includes: item.components.map((component) => component.productTitle?.trim() || 'Product'),
      productId,
    }
  }

  if (isOneTimeOrderItem(item)) {
    return { kind: 'item', title, qty, unitPrice, lineTotal, size: label && label !== ONE_TIME_DURATION ? label : null, productId }
  }

  return { kind: 'plan', title, duration: label, days, lineTotal, perDay: days > 0 ? Math.round(lineTotal / days) : 0, productId }
}

const NOUNS: [OrderLineView['kind'][], string, string][] = [
  [['subscription'], 'subscription', 'subscriptions'],
  [['plan'], 'meal plan', 'meal plans'],
  [['combo'], 'combo', 'combos'],
  [['item', 'unknown'], 'single item', 'single items'],
]

/** "1 subscription · 2 single items": what the order holds, by kind. */
export function orderKindSummary(lines: OrderLineView[]): string {
  return NOUNS.flatMap(([kinds, one, many]) => {
    const count = lines.filter((line) => kinds.includes(line.kind)).length
    return count > 0 ? [`${count} ${count === 1 ? one : many}`] : []
  }).join(SEPARATOR)
}
