import { describe, expect, it } from 'vitest'

import {
  describeOrderLine,
  groupPicks,
  mealPlanTitle,
  orderKindSummary,
  parseSubscriptionLabel,
  type OrderItemLike,
  type PlanLookup,
} from '@/utilities/orderLines'

/**
 * How the admin order page reads each stored line. An order keeps only a
 * snapshot: a built subscription folds its meal, length and every pick into
 * one label (older orders also carry a people count), so these pin how that label is taken apart again, and how a
 * line falls back when the meal plan it came from has changed since.
 */

const sub: OrderItemLike = {
  product: null,
  productTitle: 'Meal plan: High Protein Meals',
  days: 6,
  qty: 1,
  unitPrice: 736800,
  durationLabel:
    'Lunch and dinner · 1 week · Quinoa · Medium · Extra paneer · Boiled eggs · Buttermilk · Fruit bowl',
}

const lookup: PlanLookup = {
  trialLengths: ['3-day trial'],
  groups: [
    { title: 'Base', choices: ['Multigrain roti', 'Brown rice', 'Quinoa'] },
    { title: 'Spice level', choices: ['Mild', 'Medium', 'Spicy'] },
    { title: 'Protein add-ons', choices: ['Extra paneer', 'Boiled eggs', 'Sprouts bowl'] },
    { title: 'Drinks and sides', choices: ['Buttermilk', 'Detox juice', 'Fruit bowl'] },
  ],
}

describe('order lines', () => {
  it('reads a built subscription into its parts', () => {
    const line = describeOrderLine(sub, lookup)

    expect(line).toMatchObject({
      kind: 'subscription',
      title: 'High Protein Meals',
      meal: 'Lunch and dinner',
      length: '1 week',
      days: 6,
      people: null,
      trial: false,
      lineTotal: 736800,
      perDay: 122800,
    })
    expect(line.kind === 'subscription' && line.groups).toEqual([
      { title: 'Base', picks: ['Quinoa'] },
      { title: 'Spice level', picks: ['Medium'] },
      { title: 'Protein add-ons', picks: ['Extra paneer', 'Boiled eggs'] },
      { title: 'Drinks and sides', picks: ['Buttermilk', 'Fruit bowl'] },
    ])
  })

  it('marks the trial length', () => {
    const trial: OrderItemLike = {
      ...sub,
      days: 3,
      unitPrice: 83700,
      durationLabel: 'Dinner · 3-day trial · Brown rice · Mild · Sprouts bowl',
    }

    expect(describeOrderLine(trial, lookup)).toMatchObject({ kind: 'subscription', trial: true })
    expect(describeOrderLine(trial)).toMatchObject({ kind: 'subscription', trial: true })
    expect(describeOrderLine(sub)).toMatchObject({ kind: 'subscription', trial: false })
  })

  it('still reads the people count on an older order', () => {
    const older: OrderItemLike = { ...sub, durationLabel: 'Lunch and dinner · 1 week · 2 people · Quinoa · Medium' }

    expect(describeOrderLine(older, lookup)).toMatchObject({ people: '2 people', picks: ['Quinoa', 'Medium'] })
  })

  it('reads a subscription with no picks', () => {
    const plain: OrderItemLike = {
      ...sub,
      productTitle: 'Meal plan: Low-GI Dinner',
      days: 12,
      unitPrice: 298800,
      durationLabel: 'Dinner · 2 weeks',
    }
    const line = describeOrderLine(plain, { groups: [], trialLengths: [] })

    expect(line).toMatchObject({ kind: 'subscription', picks: [], groups: [], people: null })
  })

  it('falls back to a plain list when a pick no longer matches', () => {
    const changed: OrderItemLike = { ...sub, durationLabel: sub.durationLabel!.replace('Quinoa', 'Millet') }
    const line = describeOrderLine(changed, lookup)

    expect(line.kind === 'subscription' && line.groups).toBeNull()
    expect(line.kind === 'subscription' && line.picks).toEqual([
      'Millet',
      'Medium',
      'Extra paneer',
      'Boiled eggs',
      'Buttermilk',
      'Fruit bowl',
    ])
  })

  it('places a pick once, in the first group that offers it', () => {
    expect(
      groupPicks(['X', 'Y'], [
        { title: 'A', choices: ['X'] },
        { title: 'B', choices: ['X', 'Y'] },
      ]),
    ).toEqual([
      { title: 'A', picks: ['X'] },
      { title: 'B', picks: ['Y'] },
    ])
  })

  it('puts a label picked in two groups into each of them', () => {
    expect(
      groupPicks(['X', 'X'], [
        { title: 'A', choices: ['X'] },
        { title: 'B', choices: ['X'] },
      ]),
    ).toEqual([
      { title: 'A', picks: ['X'] },
      { title: 'B', picks: ['X'] },
    ])
  })

  it('keeps a shared label in the group order the picks were written in', () => {
    expect(
      groupPicks(['P', 'X'], [
        { title: 'A', choices: ['X'] },
        { title: 'B', choices: ['P', 'X'] },
      ]),
    ).toEqual([{ title: 'B', picks: ['P', 'X'] }])
  })

  it('shows a label that does not split as it is', () => {
    const old: OrderItemLike = { ...sub, productTitle: 'Meal plan: Old', durationLabel: 'Weekly' }

    expect(describeOrderLine(old)).toEqual({ kind: 'unknown', title: 'Old', detail: 'Weekly', lineTotal: 736800 })
    expect(parseSubscriptionLabel('Weekly')).toBeNull()
  })

  it('names the meal plan behind a line', () => {
    expect(mealPlanTitle('Meal plan: Everyday Indian')).toBe('Everyday Indian')
    expect(mealPlanTitle('Masala Oats Upma')).toBeNull()
    expect(mealPlanTitle(null)).toBeNull()
  })

  it('reads single items, sizes, combos and meal plan products', () => {
    expect(
      describeOrderLine({ product: 3, productTitle: 'Masala Oats Upma', durationLabel: 'one-time', days: 0, qty: 2, unitPrice: 14900 }),
    ).toEqual({ kind: 'item', title: 'Masala Oats Upma', qty: 2, unitPrice: 14900, lineTotal: 29800, size: null, productId: 3 })

    expect(
      describeOrderLine({ product: 4, productTitle: 'Millet Dosa Batter', durationLabel: '1 kg', days: 0, qty: 1, unitPrice: 15900 }),
    ).toMatchObject({ kind: 'item', size: '1 kg', lineTotal: 15900 })

    expect(
      describeOrderLine({
        product: 9,
        productTitle: 'Breakfast and Lunch Combo',
        durationLabel: 'one-time',
        days: 0,
        qty: 3,
        unitPrice: 35900,
        components: [
          { product: 3, productTitle: 'Masala Oats Upma' },
          { product: 5, productTitle: 'Paneer Tikka Bowl' },
        ],
      }),
    ).toEqual({
      kind: 'combo',
      title: 'Breakfast and Lunch Combo',
      qty: 3,
      unitPrice: 35900,
      lineTotal: 107700,
      includes: ['Masala Oats Upma', 'Paneer Tikka Bowl'],
      productId: 9,
    })

    expect(
      describeOrderLine({ product: 5, productTitle: 'Diabetic-Friendly Lunch Plan', durationLabel: '2 weeks', days: 12, qty: 1, unitPrice: 283900 }),
    ).toEqual({
      kind: 'plan',
      title: 'Diabetic-Friendly Lunch Plan',
      duration: '2 weeks',
      days: 12,
      lineTotal: 283900,
      perDay: 23658,
      productId: 5,
    })
  })

  it('summarises the kinds', () => {
    const item = describeOrderLine({ product: 3, productTitle: 'Upma', durationLabel: 'one-time', days: 0, qty: 1, unitPrice: 100 })
    const one = describeOrderLine(sub)

    expect(orderKindSummary([one, item, one])).toBe('2 subscriptions · 1 single item')
    expect(orderKindSummary([item, item])).toBe('2 single items')
  })
})
