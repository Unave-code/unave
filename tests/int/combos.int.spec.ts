import { describe, expect, it } from 'vitest'

import type { Product } from '@/payload-types'
import { comboComponents, isProductSellable, selectedComboDuration } from '@/utilities/combos'

/**
 * The rules a combo is judged by, without a database (spec 0010, AC-2 and AC-4).
 *
 * A combo is sellable only when it holds two to ten distinct products, every
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
  it('reads a one-time product and a plan with its chosen duration', () => {
    const components = comboComponents(
      combo([
        { product: oneTime },
        { durationLabel: 'One week', product: plan },
      ]),
    )

    expect(components).toHaveLength(2)
    expect(components?.[0]).toEqual({ product: 34, productTitle: 'Phulka box' })
    expect(components?.[1]).toEqual({
      days: 5,
      durationLabel: 'One week',
      product: 12,
      productTitle: 'Lunch plan',
    })
  })

  it('refuses a combo with fewer than two or more than ten products', () => {
    expect(comboComponents(combo([{ product: oneTime }]))).toBeNull()
    expect(
      comboComponents(
        combo(Array.from({ length: 11 }, () => ({ product: oneTime }))),
      ),
    ).toBeNull()
  })

  it('refuses a repeated product', () => {
    expect(
      comboComponents(combo([{ product: oneTime }, { product: oneTime }])),
    ).toBeNull()
  })

  it('refuses a paused or missing product', () => {
    expect(
      comboComponents(
        combo([{ product: { ...oneTime, available: false } }, { product: plan, durationLabel: 'One week' }]),
      ),
    ).toBeNull()

    expect(
      comboComponents(combo([{ product: null }, { product: plan, durationLabel: 'One week' }])),
    ).toBeNull()
  })

  it('refuses another combo inside a combo', () => {
    expect(
      comboComponents(combo([{ product: combo([]) }, { product: oneTime }])),
    ).toBeNull()
  })

  it('refuses a plan with no current duration, or a one-time product carrying one', () => {
    expect(comboComponents(combo([{ product: oneTime }, { product: plan }]))).toBeNull()
    expect(
      comboComponents(
        combo([{ durationLabel: 'One week', product: oneTime }, { product: plan, durationLabel: 'One week' }]),
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
    const healthy = combo([{ product: oneTime }, { product: plan, durationLabel: 'One week' }])
    expect(isProductSellable(healthy)).toBe(true)

    expect(isProductSellable(combo([{ product: oneTime }, { product: plan }]))).toBe(false)
    expect(isProductSellable({ ...healthy, available: false } as Product)).toBe(false)
  })
})
