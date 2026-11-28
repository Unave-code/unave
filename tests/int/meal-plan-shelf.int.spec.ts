import { describe, expect, it } from 'vitest'

import {
  EMPTY_MEAL_PLAN_SHELF,
  filterMealPlans,
  hasMealPlanFilters,
  mealPlanLeadPrice,
  mealPlanShelfHref,
  parseMealPlanShelf,
} from '@/utilities/mealPlanShelf'
import type { PlanBuilderData, PlanLength } from '@/utilities/planBuilder'

/**
 * The meal plan shelf on /meal-subscription (design.md §6.19): everything lives
 * in the address, nothing the address says can raise an error, and the price a
 * plan leads with follows the meals asked for.
 */

const length = (prices: PlanLength['prices'], days = 6): PlanLength => ({
  days,
  label: `${days} days`,
  note: '',
  prices,
  trial: false,
})

const plan = (overrides: Partial<PlanBuilderData>): PlanBuilderData => ({
  audience: null,
  breakfastTime: '',
  description: '',
  dinnerTime: '',
  image: null,
  lunchTime: '',
  meals: 'any',
  optionGroups: [],
  plans: [],
  slug: 'plan',
  subcategory: null,
  thisWeek: null,
  title: 'Plan',
  ...overrides,
})

const diabetic = plan({
  audience: { slug: 'diabetic', title: 'Diabetic friendly' },
  description: 'Low glycaemic meals',
  meals: 'lunch-dinner',
  plans: [length({ both: 300000, lunch: 180000 }), length({ both: 150000, lunch: 90000 }, 3)],
  slug: 'diabetic',
  thisWeek: {
    days: [
      {
        breakfast: null,
        date: '',
        day: 'Mon',
        dinner: { main: 'Ragi roti', sides: ['Dal'] },
        full: 'Monday',
        lunch: { main: 'Millet khichdi', sides: ['Cucumber raita'] },
      },
    ],
    range: '',
  },
  title: 'Steady Sugar',
})

const kids = plan({
  audience: { slug: 'kids', title: 'Kids' },
  meals: 'breakfast',
  plans: [length({ breakfast: 60000 })],
  slug: 'kids',
  title: 'Lunchbox Breakfasts',
})

const family = plan({
  audience: { slug: 'family', title: 'Family' },
  meals: 'any',
  plans: [length({ all: 450000, breakfast: 80000, dinner: 200000 })],
  slug: 'family',
  title: 'All Day Family',
})

const unpriced = plan({ slug: 'unpriced', title: 'Coming soon' })

const all = [diabetic, kids, family, unpriced]

describe('parseMealPlanShelf', () => {
  it('reads an empty address as the empty shelf', () => {
    expect(parseMealPlanShelf()).toEqual(EMPTY_MEAL_PLAN_SHELF)
  })

  it('reads every known parameter', () => {
    expect(
      parseMealPlanShelf({ audience: 'kids', from: '500', meals: 'both', q: ' khichdi ', sort: 'price-desc', to: '3000' }),
    ).toEqual({ audience: 'kids', from: 500, meals: 'both', q: 'khichdi', sort: 'price-desc', to: 3000 })
  })

  it('drops values it cannot believe instead of failing', () => {
    expect(
      parseMealPlanShelf({ audience: 'Not A Slug!', from: '-5', meals: 'brunch', sort: 'cheapest', to: '12.5' }),
    ).toEqual(EMPTY_MEAL_PLAN_SHELF)
  })

  it('treats a blank price as no limit, not zero', () => {
    expect(parseMealPlanShelf({ from: '  ', to: '' })).toMatchObject({ from: null, to: null })
  })

  it('keeps zero as a real lower bound', () => {
    expect(parseMealPlanShelf({ from: '0' }).from).toBe(0)
  })

  it('takes the last value when a parameter repeats', () => {
    expect(parseMealPlanShelf({ sort: ['name', 'price-asc'] }).sort).toBe('price-asc')
  })

  it('caps the search at 80 characters', () => {
    expect(parseMealPlanShelf({ q: 'a'.repeat(200) }).q).toHaveLength(80)
  })
})

describe('mealPlanShelfHref', () => {
  it('is the bare path for the empty shelf', () => {
    expect(mealPlanShelfHref('/meal-subscription', EMPTY_MEAL_PLAN_SHELF)).toBe('/meal-subscription')
  })

  it('leaves the default sort out of the address', () => {
    const href = mealPlanShelfHref('/meal-subscription', { ...EMPTY_MEAL_PLAN_SHELF, q: 'dal roti' })
    expect(href).toBe('/meal-subscription?q=dal+roti')
  })

  it('round-trips through the parser', () => {
    const state = { audience: 'kids', from: 0, meals: 'lunch' as const, q: 'idli', sort: 'name' as const, to: 900 }
    const href = mealPlanShelfHref('/meal-subscription', state)
    const params = Object.fromEntries(new URL(href, 'https://unave.test').searchParams)
    expect(parseMealPlanShelf(params)).toEqual(state)
  })
})

describe('hasMealPlanFilters', () => {
  it('is false for the empty shelf, and a sort alone is not a filter', () => {
    expect(hasMealPlanFilters(EMPTY_MEAL_PLAN_SHELF)).toBe(false)
    expect(hasMealPlanFilters({ ...EMPTY_MEAL_PLAN_SHELF, sort: 'name' })).toBe(false)
  })

  it('is true for a zero lower bound', () => {
    expect(hasMealPlanFilters({ ...EMPTY_MEAL_PLAN_SHELF, from: 0 })).toBe(true)
  })
})

describe('mealPlanLeadPrice', () => {
  it('leads with the cheapest price across every length and meal', () => {
    expect(mealPlanLeadPrice(diabetic)).toBe(90000)
  })

  it('follows the meals asked for', () => {
    expect(mealPlanLeadPrice(diabetic, 'both')).toBe(150000)
    expect(mealPlanLeadPrice(family, 'dinner')).toBe(200000)
  })

  it('is null when the plan has no price for those meals', () => {
    expect(mealPlanLeadPrice(kids, 'dinner')).toBeNull()
    expect(mealPlanLeadPrice(unpriced)).toBeNull()
  })
})

describe('filterMealPlans', () => {
  const titles = (plans: PlanBuilderData[]) => plans.map((p) => p.title)

  it('hides a plan with no price, and keeps admin order by default', () => {
    expect(titles(filterMealPlans(all, EMPTY_MEAL_PLAN_SHELF))).toEqual([
      'Steady Sugar',
      'Lunchbox Breakfasts',
      'All Day Family',
    ])
  })

  it('filters by audience slug', () => {
    expect(titles(filterMealPlans(all, { ...EMPTY_MEAL_PLAN_SHELF, audience: 'kids' }))).toEqual([
      'Lunchbox Breakfasts',
    ])
  })

  it('"both" needs a plan with a lunch-and-dinner price, not just both meals', () => {
    // All Day Family sells lunch and dinner, but only inside its all-meals price, so it has no lead price here.
    expect(titles(filterMealPlans(all, { ...EMPTY_MEAL_PLAN_SHELF, meals: 'both' }))).toEqual(['Steady Sugar'])
  })

  it('filters on the price for the meals asked for, in whole rupees', () => {
    // Steady Sugar leads at ₹900 for lunch; All Day Family sells no lunch-only price but offers lunch through "all".
    const lunchUnder1000 = { ...EMPTY_MEAL_PLAN_SHELF, meals: 'lunch' as const, to: 1000 }
    expect(titles(filterMealPlans(all, lunchUnder1000))).toEqual(['Steady Sugar'])
  })

  it('treats both price bounds as inclusive', () => {
    expect(titles(filterMealPlans(all, { ...EMPTY_MEAL_PLAN_SHELF, from: 600, to: 600 }))).toEqual([
      'Lunchbox Breakfasts',
    ])
  })

  it('searches this week’s dishes, ignoring case', () => {
    expect(titles(filterMealPlans(all, { ...EMPTY_MEAL_PLAN_SHELF, q: 'RAITA' }))).toEqual(['Steady Sugar'])
  })

  it('searches the audience title', () => {
    expect(titles(filterMealPlans(all, { ...EMPTY_MEAL_PLAN_SHELF, q: 'family' }))).toEqual(['All Day Family'])
  })

  it('sorts by price both ways and by name', () => {
    expect(titles(filterMealPlans(all, { ...EMPTY_MEAL_PLAN_SHELF, sort: 'price-asc' }))).toEqual([
      'Lunchbox Breakfasts',
      'All Day Family',
      'Steady Sugar',
    ])
    expect(titles(filterMealPlans(all, { ...EMPTY_MEAL_PLAN_SHELF, sort: 'price-desc' }))).toEqual([
      'Steady Sugar',
      'All Day Family',
      'Lunchbox Breakfasts',
    ])
    expect(titles(filterMealPlans(all, { ...EMPTY_MEAL_PLAN_SHELF, sort: 'name' }))).toEqual([
      'All Day Family',
      'Lunchbox Breakfasts',
      'Steady Sugar',
    ])
  })

  it('never reorders the list it was given', () => {
    const input = [...all]
    filterMealPlans(input, { ...EMPTY_MEAL_PLAN_SHELF, sort: 'name' })
    expect(input).toEqual(all)
  })
})
