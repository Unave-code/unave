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
 * meals, plan length label and the index of the chosen option in each
 * group. No price is ever on the wire; every amount is worked out here on the
 * server, at the cart, at checkout and at order creation, as product lines are.
 */

export const MEAL_PLAN_PREFIX = '@meal/'
/** The line the single plan builder used before meal plans; it now resolves as stale. */
export const LEGACY_PLAN_LINE = '@plan-builder'
export const MEAL_PLANS_PATH = '/meal-subscription'

export const mealPlanPath = (slug: string): string => `${MEAL_PLANS_PATH}/${slug}`
export const mealPlanLineProduct = (slug: string): string => `${MEAL_PLAN_PREFIX}${slug}`
export const mealPlanSlugFromLine = (product: string): null | string =>
  product.startsWith(MEAL_PLAN_PREFIX) ? product.slice(MEAL_PLAN_PREFIX.length) || null : null

/** The lunch and dinner choice, priced as one: lunch only, dinner only, or both together. */
export type PlanSlot = 'both' | 'dinner' | 'lunch'
export const PLAN_SLOTS: PlanSlot[] = ['lunch', 'dinner', 'both']

export const SLOT_LABEL: Record<PlanSlot, string> = {
  both: 'Lunch and dinner',
  dinner: 'Dinner',
  lunch: 'Lunch',
}

/** The three meals a day can hold, in the order they are eaten. */
export type Meal = 'breakfast' | 'dinner' | 'lunch'
export const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner']
export const MEAL_LABEL: Record<Meal, string> = { breakfast: 'Breakfast', dinner: 'Dinner', lunch: 'Lunch' }

/**
 * Every price a plan length can carry. Breakfast is its own price: it is added
 * on top of the lunch and dinner choice, or charged alone for breakfast only.
 */
export type PriceKey = 'breakfast' | PlanSlot

/**
 * The meals a plan may sell, any one or more of the three: "any" is all three,
 * and a pair joins its meals with "-" in eating order ("breakfast-lunch").
 */
export type MealsOffered =
  | 'any'
  | 'breakfast'
  | 'breakfast-dinner'
  | 'breakfast-lunch'
  | 'dinner'
  | 'lunch'
  | 'lunch-dinner'
export const MEALS_OFFERED: MealsOffered[] = [
  'any',
  'breakfast-lunch',
  'breakfast-dinner',
  'lunch-dinner',
  'breakfast',
  'lunch',
  'dinner',
]

/** The meals a Meals offered value holds, in eating order. */
export const mealsIn = (meals: MealsOffered): Meal[] =>
  meals === 'any' ? MEALS : MEALS.filter((meal) => meals.split('-').includes(meal))

/** The prices a plan can be bought with: each meal it offers, and lunch and dinner together when it offers both. */
export const allowedSlots = (meals: MealsOffered): PriceKey[] => {
  const offered = mealsIn(meals)
  const has = (meal: Meal) => offered.includes(meal)
  return [
    ...(has('breakfast') ? (['breakfast'] as const) : []),
    ...(has('lunch') ? (['lunch'] as const) : []),
    ...(has('dinner') ? (['dinner'] as const) : []),
    ...(has('lunch') && has('dinner') ? (['both'] as const) : []),
  ]
}

/** The meals a customer has picked: breakfast or not, and the lunch and dinner choice, if any. */
export type MealPick = { breakfast: boolean; slot: null | PlanSlot }

/** The lunch and dinner slot a set of picked meals makes. */
export const slotFor = (lunch: boolean, dinner: boolean): null | PlanSlot =>
  lunch && dinner ? 'both' : lunch ? 'lunch' : dinner ? 'dinner' : null

/** "Breakfast", "Lunch and dinner", "Breakfast, lunch and dinner"… */
export const mealPickLabel = ({ breakfast, slot }: MealPick): string => {
  const names = [
    ...(breakfast ? ['breakfast'] : []),
    ...(slot === 'both' ? ['lunch', 'dinner'] : slot ? [slot] : []),
  ]
  if (names.length === 0) return 'No meals picked'
  const text = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * The meals field of a cart line and the plan form: the picked prices joined
 * by "+", for example "breakfast+both". A line from before breakfast is just
 * the slot ("both"), which reads the same way.
 */
export const encodeMealPick = ({ breakfast, slot }: MealPick): string =>
  [...(breakfast ? ['breakfast'] : []), ...(slot ? [slot] : [])].join('+')

export const decodeMealPick = (value: string): MealPick | null => {
  const parts = value.split('+')
  const breakfast = parts[0] === 'breakfast'
  const rest = breakfast ? parts.slice(1) : parts
  if (rest.length > 1) return null
  const slot = rest[0] ?? null
  if (slot !== null && !PLAN_SLOTS.includes(slot as PlanSlot)) return null
  if (!breakfast && slot === null) return null
  return { breakfast, slot: slot as null | PlanSlot }
}

/** What one person pays for these meals at this length, or undefined when the length does not sell them. */
export const mealPickPrice = (plan: Pick<PlanLength, 'prices'>, pick: MealPick): number | undefined => {
  if (!pick.breakfast && !pick.slot) return undefined
  const breakfast = pick.breakfast ? plan.prices.breakfast : 0
  const main = pick.slot ? plan.prices[pick.slot] : 0
  if (breakfast === undefined || main === undefined) return undefined
  return breakfast + main
}

/**
 * The meals this plan really sells: only the meals it offers, and of those
 * only a meal some length has a price for.
 */
export const offeredMeals = (data: Pick<PlanBuilderData, 'meals' | 'plans'>): Meal[] =>
  mealsIn(data.meals).filter((meal) =>
    data.plans.some((plan) =>
      meal === 'breakfast'
        ? plan.prices.breakfast !== undefined
        : plan.prices[meal] !== undefined || plan.prices.both !== undefined,
    ),
  )

type PriceRow = {
  bothPrice?: null | number
  breakfastPrice?: null | number
  dinnerPrice?: null | number
  lunchPrice?: null | number
}

/**
 * The offered meals no plan length has a price for, so the site would hide
 * them. Lunch and dinner count as priced through the lunch and dinner price too.
 */
export const unpricedMeals = (meals: MealsOffered, rows: null | PriceRow[] | undefined): Meal[] => {
  const priced = (value: unknown) => typeof value === 'number' && value >= 1
  const has = (meal: Meal) =>
    (rows ?? []).some((row) =>
      meal === 'breakfast'
        ? priced(row?.breakfastPrice)
        : priced(meal === 'lunch' ? row?.lunchPrice : row?.dinnerPrice) || (allowedSlots(meals).includes('both') && priced(row?.bothPrice)),
    )
  return mealsIn(meals).filter((meal) => !has(meal))
}

export type PlanMenuMeal = { main: string; sides: string[] }
export type PlanMenuDay = {
  breakfast: null | PlanMenuMeal
  /** The calendar date this weekday falls on in the current week, "23 Nov"; empty until dated. */
  date: string
  day: string
  dinner: null | PlanMenuMeal
  full: string
  lunch: null | PlanMenuMeal
}
export type PlanMenuWeek = { days: PlanMenuDay[]; range: string }

/** A trial length always runs this many delivery days. */
export const TRIAL_DAYS = 3

export type PlanLength = {
  days: number
  label: string
  note: string
  /** A short trial: the menu shows only its days. */
  trial: boolean
  /** Per person, in paise; a missing price is not offered at this length. */
  prices: Partial<Record<PriceKey, number>>
}

export type PlanChoice = { detail: string; extraPerDay: number; label: string }
export type PlanOptionGroup = { choices: PlanChoice[]; hint: string; title: string }

export type PlanImage = { alt: string; url: string } | null

/** Everything one meal plan page and its cart line need. */
export type PlanBuilderData = {
  audience: null | { slug: string; title: string }
  breakfastTime: string
  description: string
  dinnerTime: string
  image: PlanImage
  lunchTime: string
  meals: MealsOffered
  optionGroups: PlanOptionGroup[]
  plans: PlanLength[]
  slug: string
  subcategory: null | { slug: string; title: string }
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
      | {
          breakfastMain?: unknown
          breakfastSides?: unknown
          dinnerMain?: unknown
          dinnerSides?: unknown
          lunchMain?: unknown
          lunchSides?: unknown
        }
      | null
      | undefined
    return {
      breakfast: meal(entry?.breakfastMain, entry?.breakfastSides),
      date: '',
      day,
      dinner: meal(entry?.dinnerMain, entry?.dinnerSides),
      full,
      lunch: meal(entry?.lunchMain, entry?.lunchSides),
    }
  })
  if (!days.some((d) => d.breakfast || d.lunch || d.dinner)) return null
  return { days, range: '' }
}

const IST_OFFSET_MS = 330 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * The Monday to Saturday the menu is for, as calendar dates in India. On a
 * Sunday, when nothing is delivered, that is the week starting tomorrow.
 */
export const currentMenuWeek = (now: Date = new Date()): { dates: string[]; range: string } => {
  const local = new Date(now.getTime() + IST_OFFSET_MS)
  const weekday = local.getUTCDay() // 0 is Sunday
  const toMonday = weekday === 0 ? 1 : 1 - weekday
  const monday = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + toMonday * DAY_MS
  const days = DAYS.map((_, i) => new Date(monday + i * DAY_MS))
  const label = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
  const first = days[0]
  const last = days[days.length - 1]
  const range =
    first.getUTCMonth() === last.getUTCMonth()
      ? `${first.getUTCDate()} – ${label(last)}`
      : `${label(first)} – ${label(last)}`

  return { dates: days.map(label), range }
}

/** The plan with its menu dated to the current week (Mon–Sat, India time). */
export const withCurrentWeek = (data: PlanBuilderData, now: Date = new Date()): PlanBuilderData => {
  if (!data.thisWeek) return data
  const week = currentMenuWeek(now)
  return {
    ...data,
    thisWeek: {
      days: data.thisWeek.days.map((day, i) => ({ ...day, date: week.dates[i] ?? '' })),
      range: week.range,
    },
  }
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
  const meals: MealsOffered = MEALS_OFFERED.includes(doc.meals as MealsOffered) ? (doc.meals as MealsOffered) : 'any'
  const allowed = allowedSlots(meals)
  const seen = new Set<string>()

  const plans: PlanLength[] = (doc.prices ?? [])
    .map((row) => {
      const prices: Partial<Record<PriceKey, number>> = {}
      const raw: Record<PriceKey, unknown> = {
        both: row?.bothPrice,
        breakfast: row?.breakfastPrice,
        dinner: row?.dinnerPrice,
        lunch: row?.lunchPrice,
      }
      for (const slot of allowed) {
        const value = paise(raw[slot])
        if (Number.isSafeInteger(value) && value >= 1) prices[slot] = value
      }
      return {
        days: row?.trial ? TRIAL_DAYS : Number(row?.days),
        label: text(row?.length).replace(/\|/g, ' '),
        note: text(row?.note),
        trial: Boolean(row?.trial),
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

  const subcategory =
    doc.subcategory && typeof doc.subcategory === 'object' && doc.subcategory.slug
      ? { slug: text(doc.subcategory.slug), title: text(doc.subcategory.title) }
      : null

  return {
    audience,
    breakfastTime: text(doc.breakfastTime),
    description: text(doc.description),
    dinnerTime: text(doc.dinnerTime),
    image: readImage(doc.image),
    lunchTime: text(doc.lunchTime),
    meals,
    optionGroups: readOptionGroups(doc.optionGroups),
    plans,
    slug: doc.slug,
    subcategory,
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

export type PlanSelection = MealPick & {
  /** The picked choices' indexes in each option group, in group order; any number per group, none included. */
  choices: number[][]
  plan: string
}

/**
 * The cart line's duration value: meals|plan label|choices, the meals as
 * encodeMealPick writes them ("breakfast+both"), the choices as
 * groups split by "." and the picked indexes in a group split by "+". An older
 * pick-one line ("0.1") reads as one pick per group, so it still resolves.
 *
 * Lines from before plans dropped the people count carry it as a third field
 * (slot|plan|people|choices). A one-person line still resolves; a line for more
 * people resolves as stale rather than quietly charging for one.
 */
export const encodePlanSelection = (selection: PlanSelection): string =>
  [encodeMealPick(selection), selection.plan, selection.choices.map((group) => group.join('+')).join('.')].join('|')

export const decodePlanSelection = (value: string): null | PlanSelection => {
  const parts = value.split('|')
  if (parts.length === 4) {
    if (parts[2] !== '1') return null
    parts.splice(2, 1)
  }
  if (parts.length !== 3) return null
  const [meals, plan, choices] = parts
  const pick = decodeMealPick(meals)
  if (!pick) return null
  const groups = choices.split('.').map((group) => (group ? group.split('+').map(Number) : []))
  if (groups.some((group) => group.some((index) => !Number.isSafeInteger(index) || index < 0))) return null
  return { ...pick, choices: groups, plan: plan.trim() }
}

export type PricedPlan = {
  /** Delivery days in the plan. */
  days: number
  /** The plain description the cart, checkout and order show. */
  detail: string
  /** What the line charges, in paise: every option, the whole plan. */
  total: number
}

/**
 * Prices a selection against the live meal plan, or null when
 * anything in it no longer exists (a renamed length, a removed option, a meal
 * choice the plan no longer offers).
 */
export const pricePlanSelection = (data: PlanBuilderData, selection: PlanSelection): null | PricedPlan => {
  const plan = data.plans.find((p) => p.label.toLowerCase() === selection.plan.toLowerCase())
  if (!plan) return null
  const price = mealPickPrice(plan, selection)
  if (price === undefined) return null
  // A group past the plan's last one may only be empty (an encoding of no groups reads as one empty group).
  if (selection.choices.slice(data.optionGroups.length).some((group) => group.length > 0)) return null

  const chosen: PlanChoice[] = []
  for (const [i, group] of data.optionGroups.entries()) {
    const picked = selection.choices[i] ?? []
    if (new Set(picked).size !== picked.length) return null
    for (const index of picked) {
      const choice = group.choices[index]
      if (!choice) return null
      chosen.push(choice)
    }
  }

  const total = price + chosen.reduce((sum, c) => sum + c.extraPerDay, 0) * plan.days

  if (!Number.isSafeInteger(total) || total < 1) return null

  const detail = [mealPickLabel(selection), plan.label, ...chosen.map((c) => c.label)].join(' · ')

  return { days: plan.days, detail, total }
}
