import type { MealPlan } from '@/payload-types'

/**
 * Meal plans and their pricing (/meal-subscription and its cart lines).
 *
 * Each meal plan (Catalogue → Meal plans) carries everything it sells: its plan
 * lengths and prices, its pick-one options, its delivery times and its menu.
 *
 * A built plan rides the cart cookie like any other line. The product is the
 * meal plan's slug behind a reserved prefix no product slug can take (slugs never
 * hold "@"), and the duration carries the customer's choices as plain identifiers:
 * meals, plan length label, people and the index of the chosen option in each
 * group. No price is ever on the wire; every amount is worked out here on the
 * server, at the cart, at checkout and at order creation, as product lines are.
 */

export const MEAL_PLAN_PREFIX = '@meal/'
/** The line the single plan builder used before meal plans; it now resolves as stale. */
export const LEGACY_PLAN_LINE = '@plan-builder'
export const MEAL_PLANS_PATH = '/meal-subscription'
/** The most people one built plan can feed. */
export const PLAN_MAX_PEOPLE = 10

export const mealPlanPath = (slug: string): string => `${MEAL_PLANS_PATH}/${slug}`
export const mealPlanLineProduct = (slug: string): string => `${MEAL_PLAN_PREFIX}${slug}`
export const mealPlanSlugFromLine = (product: string): null | string =>
  product.startsWith(MEAL_PLAN_PREFIX) ? product.slice(MEAL_PLAN_PREFIX.length) || null : null

export type PlanSlot = 'both' | 'dinner' | 'lunch'
export const PLAN_SLOTS: PlanSlot[] = ['lunch', 'dinner', 'both']

export const SLOT_LABEL: Record<PlanSlot, string> = {
  both: 'Lunch and dinner',
  dinner: 'Dinner',
  lunch: 'Lunch',
}

export type MealsOffered = 'any' | 'dinner' | 'lunch'

/** The meal choices a plan can be bought with. */
export const allowedSlots = (meals: MealsOffered): PlanSlot[] =>
  meals === 'lunch' ? ['lunch'] : meals === 'dinner' ? ['dinner'] : PLAN_SLOTS

export type PlanMenuMeal = { main: string; sides: string[] }
export type PlanMenuDay = { day: string; dinner: null | PlanMenuMeal; full: string; lunch: null | PlanMenuMeal }
export type PlanMenuWeek = { days: PlanMenuDay[]; range: string }

export type PlanLength = {
  days: number
  label: string
  note: string
  /** Per person, in paise; a missing slot is not offered at this length. */
  prices: Partial<Record<PlanSlot, number>>
}

export type PlanChoice = { detail: string; extraPerDay: number; label: string }
export type PlanOptionGroup = { choices: PlanChoice[]; hint: string; title: string }

export type PlanImage = { alt: string; url: string } | null

/** Everything one meal plan page and its cart line need. */
export type PlanBuilderData = {
  audience: null | { slug: string; title: string }
  description: string
  dinnerTime: string
  image: PlanImage
  lunchTime: string
  meals: MealsOffered
  optionGroups: PlanOptionGroup[]
  plans: PlanLength[]
  slug: string
  thisWeek: null | PlanMenuWeek
  title: string
}

const DAYS = [
  ['mon', 'Mon', 'Monday'],
  ['tue', 'Tue', 'Tuesday'],
  ['wed', 'Wed', 'Wednesday'],
  ['thu', 'Thu', 'Thursday'],
  ['fri', 'Fri', 'Friday'],
  ['sat', 'Sat', 'Saturday'],
] as const

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const paise = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : Number.NaN

const meal = (main: unknown, sides: unknown): null | PlanMenuMeal => {
  const name = text(main)
  if (!name) return null
  return {
    main: name,
    sides: text(sides)
      .split(',')
      .map((side) => side.trim())
      .filter(Boolean),
  }
}

const readWeek = (week: MealPlan['thisWeek'] | null | undefined): null | PlanMenuWeek => {
  if (!week) return null
  const days = DAYS.map(([key, day, full]) => {
    const entry = (week as Record<string, unknown>)[key] as
      | { dinnerMain?: unknown; dinnerSides?: unknown; lunchMain?: unknown; lunchSides?: unknown }
      | null
      | undefined
    return {
      day,
      dinner: meal(entry?.dinnerMain, entry?.dinnerSides),
      full,
      lunch: meal(entry?.lunchMain, entry?.lunchSides),
    }
  })
  if (!days.some((d) => d.lunch || d.dinner)) return null
  return { days, range: text(week.range) }
}

const readImage = (image: MealPlan['image']): PlanImage =>
  image && typeof image === 'object' && image.url ? { alt: text(image.alt), url: image.url } : null

const readOptionGroups = (groups: MealPlan['optionGroups']): PlanOptionGroup[] =>
  (groups ?? [])
    .map((group) => ({
      choices: (group?.choices ?? [])
        .map((choice) => ({
          detail: text(choice?.detail),
          extraPerDay: paise(choice?.extraPerDay ?? 0),
          label: text(choice?.label),
        }))
        .filter((choice) => choice.label && Number.isSafeInteger(choice.extraPerDay)),
      hint: text(group?.hint),
      title: text(group?.title),
    }))
    .filter((group) => group.title && group.choices.length > 0)

/** One meal plan, trimmed and typed: broken rows dropped, lengths keep only the prices it sets. */
export const normalizeMealPlan = (doc: MealPlan): PlanBuilderData => {
  const meals: MealsOffered = doc.meals === 'lunch' || doc.meals === 'dinner' ? doc.meals : 'any'
  const allowed = allowedSlots(meals)
  const seen = new Set<string>()

  const plans: PlanLength[] = (doc.prices ?? [])
    .map((row) => {
      const prices: Partial<Record<PlanSlot, number>> = {}
      const raw = { both: row?.bothPrice, dinner: row?.dinnerPrice, lunch: row?.lunchPrice }
      for (const slot of allowed) {
        const value = paise(raw[slot])
        if (Number.isSafeInteger(value) && value >= 1) prices[slot] = value
      }
      return {
        days: Number(row?.days),
        label: text(row?.length).replace(/\|/g, ' '),
        note: text(row?.note),
        prices,
      }
    })
    .filter((plan) => {
      // A length is found by its name, so the first row with a name wins.
      const key = plan.label.toLowerCase()
      if (!plan.label || seen.has(key) || !Number.isSafeInteger(plan.days) || plan.days < 1) return false
      if (Object.keys(plan.prices).length === 0) return false
      seen.add(key)
      return true
    })

  const audience =
    doc.audience && typeof doc.audience === 'object'
      ? { slug: text(doc.audience.slug), title: text(doc.audience.title) }
      : null

  return {
    audience,
    description: text(doc.description),
    dinnerTime: text(doc.dinnerTime),
    image: readImage(doc.image),
    lunchTime: text(doc.lunchTime),
    meals,
    optionGroups: readOptionGroups(doc.optionGroups),
    plans,
    slug: doc.slug,
    thisWeek: readWeek(doc.thisWeek),
    title: text(doc.title),
  }
}

/** The lowest price one person can start this plan at, or null when it sells nothing. */
export const fromPrice = (data: PlanBuilderData): null | number => {
  const all = data.plans.flatMap((plan) => Object.values(plan.prices))
  return all.length ? Math.min(...all) : null
}

/* ------------------------------------------------------------ selection */

export type PlanSelection = {
  /** The chosen choice's index in each option group, in group order. */
  choices: number[]
  people: number
  plan: string
  slot: PlanSlot
}

/** The cart line's duration value: slot|plan label|people|choice indexes. */
export const encodePlanSelection = (selection: PlanSelection): string =>
  [selection.slot, selection.plan, String(selection.people), selection.choices.join('.')].join('|')

export const decodePlanSelection = (value: string): null | PlanSelection => {
  const parts = value.split('|')
  if (parts.length !== 4) return null
  const [slot, plan, people, choices] = parts
  if (!PLAN_SLOTS.includes(slot as PlanSlot)) return null
  const count = Number(people)
  if (!Number.isSafeInteger(count) || count < 1) return null
  const indexes = choices ? choices.split('.').map(Number) : []
  if (indexes.some((index) => !Number.isSafeInteger(index) || index < 0)) return null
  return { choices: indexes, people: count, plan: plan.trim(), slot: slot as PlanSlot }
}

export type PricedPlan = {
  /** Delivery days in the plan. */
  days: number
  /** The plain description the cart, checkout and order show. */
  detail: string
  /** What the line charges, in paise: every person, every option, the whole plan. */
  total: number
}

/**
 * Prices a selection against the live meal plan, or null when
 * anything in it no longer exists (a renamed length, a removed option, a meal
 * choice the plan no longer offers, too many people).
 */
export const pricePlanSelection = (data: PlanBuilderData, selection: PlanSelection): null | PricedPlan => {
  const plan = data.plans.find((p) => p.label.toLowerCase() === selection.plan.toLowerCase())
  if (!plan) return null
  const price = plan.prices[selection.slot]
  if (price === undefined) return null
  if (selection.people > PLAN_MAX_PEOPLE) return null
  if (selection.choices.length !== data.optionGroups.length) return null

  const chosen = data.optionGroups.map((group, i) => group.choices[selection.choices[i]])
  if (chosen.some((choice) => !choice)) return null

  const perPerson = price + chosen.reduce((sum, c) => sum + c.extraPerDay, 0) * plan.days
  const total = perPerson * selection.people

  if (!Number.isSafeInteger(total) || total < 1) return null

  const detail = [
    SLOT_LABEL[selection.slot],
    plan.label,
    selection.people + (selection.people === 1 ? ' person' : ' people'),
    ...chosen.map((c) => c.label),
  ].join(' · ')

  return { days: plan.days, detail, total }
}
