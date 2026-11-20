import type { PlanBuilder as PlanBuilderDoc } from '@/payload-types'

/**
 * The plan builder's data and pricing (the /meal-subscription page and its cart line).
 *
 * A built plan rides the cart cookie like any other line: the product is the
 * reserved slug below, which no product can ever take (slugs never start with
 * "@"), and the duration carries the customer's choices as plain identifiers:
 * meals, plan length label, people and the index of the chosen option in each
 * group. No price is ever on the wire; every amount is worked out here from the
 * plan builder global on the server, at the cart, at checkout and at order
 * creation, exactly as product lines are.
 */

export const PLAN_BUILDER_SLUG = '@plan-builder'
export const PLAN_BUILDER_PATH = '/meal-subscription'
export const PLAN_BUILDER_TITLE = 'Weekly meal plan'
/** The most people one built plan can feed. */
export const PLAN_MAX_PEOPLE = 10

export type PlanSlot = 'both' | 'dinner' | 'lunch'
export const PLAN_SLOTS: PlanSlot[] = ['lunch', 'dinner', 'both']

export const SLOT_LABEL: Record<PlanSlot, string> = {
  both: 'Lunch and dinner',
  dinner: 'Dinner',
  lunch: 'Lunch',
}

export type PlanMenuMeal = { main: string; sides: string[] }
export type PlanMenuDay = { day: string; dinner: null | PlanMenuMeal; full: string; lunch: null | PlanMenuMeal }
export type PlanMenuWeek = { days: PlanMenuDay[]; range: string }

export type PlanLength = {
  days: number
  label: string
  note: string
  prices: Record<PlanSlot, number>
}

export type PlanChoice = { detail: string; extraPerDay: number; label: string }
export type PlanOptionGroup = { choices: PlanChoice[]; hint: string; title: string }

export type PlanBuilderData = {
  copy: { eyebrow: string; heading: string; intro: string; noticeBody: string; noticeTitle: string }
  dinnerTime: string
  lunchTime: string
  nextWeek: null | PlanMenuWeek
  optionGroups: PlanOptionGroup[]
  plans: PlanLength[]
  thisWeek: null | PlanMenuWeek
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

type WeekDoc = PlanBuilderDoc['thisWeek']

const readWeek = (week: WeekDoc | null | undefined): null | PlanMenuWeek => {
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

/** The global as the page and the cart use it: trimmed, typed, broken rows dropped. */
export const normalizePlanBuilder = (doc: null | PlanBuilderDoc | undefined): PlanBuilderData => {
  const plans: PlanLength[] = (doc?.plans ?? [])
    .map((plan) => ({
      days: Number(plan?.days),
      label: text(plan?.label).replace(/\|/g, ' '),
      note: text(plan?.note),
      prices: {
        both: paise(plan?.bothPrice),
        dinner: paise(plan?.dinnerPrice),
        lunch: paise(plan?.lunchPrice),
      },
    }))
    .filter(
      (plan) =>
        plan.label &&
        Number.isSafeInteger(plan.days) &&
        plan.days >= 1 &&
        PLAN_SLOTS.every((slot) => Number.isSafeInteger(plan.prices[slot]) && plan.prices[slot] >= 1),
    )

  const optionGroups: PlanOptionGroup[] = (doc?.optionGroups ?? [])
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


  return {
    copy: {
      eyebrow: text(doc?.eyebrow),
      heading: text(doc?.heading),
      intro: text(doc?.intro),
      noticeBody: text(doc?.noticeBody),
      noticeTitle: text(doc?.noticeTitle),
    },
    dinnerTime: text(doc?.dinnerTime),
    lunchTime: text(doc?.lunchTime),
    nextWeek: readWeek(doc?.nextWeek),
    optionGroups,
    plans,
    thisWeek: readWeek(doc?.thisWeek),
  }
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
 * Prices a selection against the live global, or null when anything in it no
 * longer exists (a renamed plan length, a removed option, too many people).
 */
export const pricePlanSelection = (data: PlanBuilderData, selection: PlanSelection): null | PricedPlan => {
  const plan = data.plans.find((p) => p.label.toLowerCase() === selection.plan.toLowerCase())
  if (!plan) return null
  if (selection.people > PLAN_MAX_PEOPLE) return null
  if (selection.choices.length !== data.optionGroups.length) return null

  const chosen = data.optionGroups.map((group, i) => group.choices[selection.choices[i]])
  if (chosen.some((choice) => !choice)) return null

  const perPerson = plan.prices[selection.slot] + chosen.reduce((sum, c) => sum + c.extraPerDay, 0) * plan.days
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
