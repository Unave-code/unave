import { describe, expect, it } from 'vitest'

import type { Product } from '@/payload-types'
import { comboComponents, isProductSellable, selectedComboDuration } from '@/utilities/combos'

/**
 * The rules a combo is judged by, without a database (spec 0010, AC-2 and AC-4).
 *
 * A combo is sellable only when it holds one to ten distinct products, every
 * one of them exists, is available and is not itself a combo, and every meal
 * plan carries exactly one current duration. The same judgement decides the
 * paused label on a card and whether a cart line is stale, so it lives in one
 * place and is held here.
 */

const plan = {
  available: true,
  durations: [
    { days: 5, id: 'd1', label: 'One week', price: 150000 },
    { days: 22, id: 'd2', label: 'One month', price: 660000 },
  ],
  id: 12,
  slug: 'lunch-plan',
  title: 'Lunch plan',
  type: 'plan',
} as unknown as Product

const oneTime = {
  available: true,
  id: 34,
  price: 4900,
  slug: 'phulka-box',
  title: 'Phulka box',
  type: 'one-time',
} as unknown as Product

const dal = {
  available: true,
  id: 35,
  price: 2500,
  slug: 'dal-tin',
  title: 'Dal tin',
  type: 'one-time',
} as unknown as Product

const combo = (components: unknown[], overrides: Record<string, unknown> = {}) =>
  ({
    available: true,
    components,
    id: 99,
    price: 99000,
    slug: 'family-combo',
    title: 'Family combo',
    type: 'combo',
    ...overrides,
  }) as unknown as Product

describe('selectedComboDuration', () => {
  it('finds a duration by label, trimmed and ignoring case', () => {
    expect(selectedComboDuration(plan, '  one WEEK ')?.label).toBe('One week')
  })

  it('answers nothing for a label the plan no longer has', () => {
    expect(selectedComboDuration(plan, 'Two weeks')).toBeNull()
    expect(selectedComboDuration(plan, '')).toBeNull()
    expect(selectedComboDuration(plan, null)).toBeNull()
  })

  it('answers nothing when the label is ambiguous', () => {
    const doubled = {
      ...plan,
      durations: [
        { days: 5, id: 'd1', label: 'One week', price: 150000 },
        { days: 6, id: 'd2', label: 'one week', price: 160000 },
      ],
    } as unknown as Product

    expect(selectedComboDuration(doubled, 'One week')).toBeNull()
  })
})

describe('comboComponents', () => {
  it('reads its single items, in order', () => {
    expect(comboComponents(combo([{ product: oneTime }, { product: dal }]))).toEqual([
      { product: 34, productTitle: 'Phulka box' },
      { product: 35, productTitle: 'Dal tin' },
    ])
  })

  it('accepts a single product and refuses none or more than ten', () => {
    expect(comboComponents(combo([{ product: oneTime }]))).toHaveLength(1)
    expect(comboComponents(combo([]))).toBeNull()
    expect(
      comboComponents(combo(Array.from({ length: 11 }, () => ({ product: oneTime })))),
    ).toBeNull()
  })

  it('refuses a repeated product', () => {
    expect(comboComponents(combo([{ product: oneTime }, { product: oneTime }]))).toBeNull()
  })

  it('refuses a paused or missing product', () => {
    expect(
      comboComponents(
        combo([
          { product: { ...oneTime, available: false } },
          { product: plan, durationLabel: 'One week' },
        ]),
      ),
    ).toBeNull()

    expect(
      comboComponents(combo([{ product: null }, { product: plan, durationLabel: 'One week' }])),
    ).toBeNull()
  })

  it('refuses another combo inside a combo', () => {
    expect(comboComponents(combo([{ product: combo([]) }, { product: oneTime }]))).toBeNull()
  })

  it('refuses a meal plan inside a combo, since only single items go in', () => {
    expect(comboComponents(combo([{ product: oneTime }, { product: plan }]))).toBeNull()
  })

  it('refuses a duration the plan no longer has, or a one-time product carrying one', () => {
    expect(
      comboComponents(combo([{ product: oneTime }, { durationLabel: 'Two weeks', product: plan }])),
    ).toBeNull()
    expect(
      comboComponents(
        combo([
          { durationLabel: 'One week', product: oneTime },
          { product: plan, durationLabel: 'One week' },
        ]),
      ),
    ).toBeNull()
  })
})

describe('isProductSellable', () => {
  it('is true for an available plan or one-time product', () => {
    expect(isProductSellable(plan)).toBe(true)
    expect(isProductSellable(oneTime)).toBe(true)
  })

  it('is true for a healthy combo and false for a broken one', () => {
    const healthy = combo([{ product: oneTime }, { product: dal }])
    expect(isProductSellable(healthy)).toBe(true)

    // Only single items go inside a combo.
    expect(isProductSellable(combo([{ product: oneTime }, { product: plan }]))).toBe(false)

    // A meal plan with items is sold by duration but still needs sellable items.
    const planCombo = { ...healthy, combo: true, mealPlan: true, type: 'plan' } as Product
    expect(isProductSellable(planCombo)).toBe(true)
    expect(
      isProductSellable({
        ...planCombo,
        components: [{ product: { ...oneTime, available: false } }],
      } as Product),
    ).toBe(false)
    expect(isProductSellable({ ...healthy, available: false } as Product)).toBe(false)
  })
})
