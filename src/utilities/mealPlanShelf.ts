import { allowedSlots, type PlanBuilderData, type PlanSlot } from './planBuilder'

/**
 * The meal plan shelf on /meal-subscription: search, filters and sort, the same
 * way the products shelf works (design.md §6.19).
 *
 * Everything lives in the address (`?q=&audience=&meals=&from=&to=&sort=`), so a
 * view can be linked, bookmarked and reloaded and the page works with
 * JavaScript off. There are only ever a few dozen plans, so the shelf reads them
 * all and filters here rather than in the database, which lets the search reach
 * this week's dishes and the price follow the meals asked for.
 */

export type MealPlanSortKey = 'name' | 'price-asc' | 'price-desc' | 'recommended'

export const MEAL_PLAN_SORT_ORDER: MealPlanSortKey[] = ['recommended', 'price-asc', 'price-desc', 'name']

export const MEAL_PLAN_SORT_LABEL: Record<MealPlanSortKey, string> = {
  name: 'Name A–Z',
  'price-asc': 'Price, low to high',
  'price-desc': 'Price, high to low',
  recommended: 'Recommended',
}

export const MEALS_FILTER_LABEL: Record<PlanSlot, string> = {
  both: 'Lunch and dinner',
  dinner: 'Dinner',
  lunch: 'Lunch',
}

export interface MealPlanShelfState {
  audience: null | string
  /** The low end of the price range, in whole rupees, for one person. */
  from: null | number
  meals: null | PlanSlot
  q: string
  sort: MealPlanSortKey
  to: null | number
}

export const EMPTY_MEAL_PLAN_SHELF: MealPlanShelfState = {
  audience: null,
  from: null,
  meals: null,
  q: '',
  sort: 'recommended',
  to: null,
}

export type MealPlanSearchParams = Record<string, string | string[] | undefined>

const last = (value: string | string[] | undefined): undefined | string =>
  Array.isArray(value) ? value[value.length - 1] : value

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const wholeRupees = (raw: undefined | string): null | number => {
  if (raw === undefined || raw.trim() === '') return null
  const value = Number(raw)
  return Number.isInteger(value) && value >= 0 ? value : null
}

/** Reads the address; anything it cannot believe is dropped, never an error. */
export const parseMealPlanShelf = (raw: MealPlanSearchParams = {}): MealPlanShelfState => {
  const audience = last(raw.audience)
  const meals = last(raw.meals)
  const sort = last(raw.sort)
  return {
    audience: audience && SLUG_PATTERN.test(audience) ? audience : null,
    from: wholeRupees(last(raw.from)),
    meals: meals === 'lunch' || meals === 'dinner' || meals === 'both' ? meals : null,
    q: (last(raw.q) ?? '').trim().slice(0, 80),
    sort: sort && (MEAL_PLAN_SORT_ORDER as string[]).includes(sort) ? (sort as MealPlanSortKey) : 'recommended',
    to: wholeRupees(last(raw.to)),
  }
}

export const mealPlanShelfHref = (basePath: string, state: MealPlanShelfState): string => {
  const params = new URLSearchParams()
  if (state.q) params.set('q', state.q)
  if (state.audience) params.set('audience', state.audience)
  if (state.meals) params.set('meals', state.meals)
  if (state.from !== null) params.set('from', String(state.from))
  if (state.to !== null) params.set('to', String(state.to))
  if (state.sort !== 'recommended') params.set('sort', state.sort)
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

export const hasMealPlanFilters = (state: MealPlanShelfState): boolean =>
  Boolean(state.q || state.audience || state.meals || state.from !== null || state.to !== null)

/**
 * The price a plan leads with for one person, in paise: its cheapest length for
 * the meals asked for, or for any meals it sells when none were asked for.
 */
export const mealPlanLeadPrice = (plan: PlanBuilderData, meals: null | PlanSlot = null): null | number => {
  const prices = plan.plans.flatMap((length) =>
    meals ? (length.prices[meals] !== undefined ? [length.prices[meals]!] : []) : Object.values(length.prices),
  )
  return prices.length ? Math.min(...prices) : null
}

const matchesSearch = (plan: PlanBuilderData, q: string): boolean => {
  const needle = q.toLowerCase()
  const dishes = (plan.thisWeek?.days ?? []).flatMap((day) =>
    [day.lunch, day.dinner].flatMap((meal) => (meal ? [meal.main, ...meal.sides] : [])),
  )
  return [plan.title, plan.description, plan.audience?.title ?? '', ...dishes].some((text) =>
    text.toLowerCase().includes(needle),
  )
}

/** The plans this view shows, in the order it asks for. Input is in admin order. */
export const filterMealPlans = (plans: PlanBuilderData[], state: MealPlanShelfState): PlanBuilderData[] => {
  const shown = plans.filter((plan) => {
    if (state.audience && plan.audience?.slug !== state.audience) return false
    if (state.meals && !allowedSlots(plan.meals).includes(state.meals)) return false
    const price = mealPlanLeadPrice(plan, state.meals)
    if (price === null) return false
    if (state.from !== null && price < state.from * 100) return false
    if (state.to !== null && price > state.to * 100) return false
    if (state.q && !matchesSearch(plan, state.q)) return false
    return true
  })

  if (state.sort === 'recommended') return shown
  const price = (plan: PlanBuilderData) => mealPlanLeadPrice(plan, state.meals) ?? 0
  return [...shown].sort((a, b) =>
    state.sort === 'name'
      ? a.title.localeCompare(b.title)
      : state.sort === 'price-asc'
        ? price(a) - price(b)
        : price(b) - price(a),
  )
}
