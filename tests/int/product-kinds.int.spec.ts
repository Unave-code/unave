import { describe, expect, it } from 'vitest'

import { normalizeProductShape } from '@/collections/Products/hooks/normalizeProductShape'
import { setLeadPrice } from '@/collections/Products/hooks/leadPrice'
import type { Product } from '@/payload-types'
import { comboProblems, comboSeparatePrice } from '@/utilities/combos'

/**
 * The three kinds of product — meal plan, one-time purchase, combo — stay
 * coherent: each keeps only its own fields, the lead price survives a partial
 * save, and a combo can say why it cannot be sold and what it saves.
 */

const plan = {
  available: true,
  durations: [
    { days: 5, id: 'd1', label: 'One week', price: 150000 },
    { days: 22, id: 'd2', label: 'One month', price: 660000 },
  ],
  id: 12,
  title: 'Lunch plan',
  type: 'plan',
} as unknown as Product

const oneTime = {
  available: true,
  id: 34,
  price: 4900,
  title: 'Phulka box',
  type: 'one-time',
} as unknown as Product

const combo = (components: unknown[], price = 150000) =>
  ({
    available: true,
    components,
    id: 99,
    price,
    title: 'Family combo',
    type: 'combo',
  }) as unknown as Product

// The hooks only read `data` and `originalDoc`; the rest of the hook arguments are irrelevant here.
const run = <T>(hook: (args: never) => T, data: Partial<Product>, originalDoc?: Partial<Product>) =>
  hook({ data, originalDoc } as never) as Partial<Product>

describe('each kind keeps only its own fields', () => {
  it('clears a plan’s durations when it becomes a one-time product', () => {
    const out = run(
      normalizeProductShape,
      { price: 4900, type: 'one-time' },
      { durations: plan.durations, type: 'plan' },
    )
    expect(out.durations).toEqual([])
    expect(out.components).toEqual([])
    expect(out.price).toBe(4900)
  })

  it('clears a one-time product’s price fields when it becomes a plan', () => {
    const out = run(
      normalizeProductShape,
      { durations: plan.durations, type: 'plan' },
      { compareAtPrice: 6000, packSize: '260 g', price: 4900, type: 'one-time' },
    )
    expect(out.price).toBeNull()
    expect(out.compareAtPrice).toBeNull()
    expect(out.packSize).toBeNull()
    expect(out.durations).toEqual(plan.durations)
  })

  it('leaves the pricing alone on a partial save that keeps the kind', () => {
    const out = run(
      normalizeProductShape,
      { available: false },
      { durations: plan.durations, type: 'plan' },
    )
    expect(out).toEqual({ available: false })
  })
})

describe('the lead price survives a partial save', () => {
  it('reads the stored durations when the update does not carry them', () => {
    const out = run(setLeadPrice, { available: false }, { durations: plan.durations, type: 'plan' })
    expect(out.fromPrice).toBe(30000)
  })

  it('uses the new price when the update carries one', () => {
    const out = run(setLeadPrice, { price: 5900 }, { price: 4900, type: 'one-time' })
    expect(out.fromPrice).toBe(5900)
  })
})

describe('a combo’s value and health', () => {
  const items = [{ durationLabel: 'One week', product: plan }, { product: oneTime }]

  it('adds up what the items cost bought one by one', () => {
    expect(comboSeparatePrice(combo(items))).toBe(154900)
  })

  it('cannot price a combo with an item it can no longer price', () => {
    expect(
      comboSeparatePrice(
        combo([{ durationLabel: 'Two weeks', product: plan }, { product: oneTime }]),
      ),
    ).toBeNull()
  })

  it('has nothing to report when every item can be sold', () => {
    expect(comboProblems(combo(items))).toEqual([])
  })

  it('names a paused item, a lost duration and a missing item', () => {
    const problems = comboProblems(
      combo([
        { durationLabel: 'Two weeks', product: plan },
        { product: { ...oneTime, available: false } },
        { product: null, productTitleSnapshot: 'Old dal' },
      ]),
    )
    expect(problems).toEqual([
      'Lunch plan no longer has the duration "Two weeks". Choose one of its current durations.',
      'Phulka box is paused, so the combo cannot be bought.',
      'Old dal no longer exists. Remove it or pick another product.',
    ])
  })

  it('says nothing about a product that is not a combo', () => {
    expect(comboProblems(plan)).toEqual([])
    expect(comboSeparatePrice(plan)).toBeNull()
  })
})
