import { describe, expect, it } from 'vitest'

import {
  allowedSlots,
  decodePlanSelection,
  encodePlanSelection,
  type MealsOffered,
  offeredMeals,
  unpricedMeals,
  type PlanBuilderData,
  pricePlanSelection,
} from '@/utilities/planBuilder'

const data = {
  optionGroups: [
    { choices: [{ detail: '', extraPerDay: 0, label: 'Rice' }, { detail: '', extraPerDay: 2000, label: 'Roti' }], hint: '', title: 'Carb' },
    { choices: [{ detail: '', extraPerDay: 500, label: 'Juice' }], hint: '', title: 'Extra' },
  ],
  plans: [{ days: 6, label: 'Week', note: '', prices: { both: 300000, breakfast: 60000 } }],
} as unknown as PlanBuilderData

describe('plan selection with add-ons', () => {
  it('round-trips several picks per group and none', () => {
    const value = encodePlanSelection({ choices: [[0, 1], []], plan: 'Week', slot: 'both', breakfast: false })
    expect(value).toBe('both|Week|0+1.')
    expect(decodePlanSelection(value)?.choices).toEqual([[0, 1], []])
  })

  it('prices every picked add-on per day', () => {
    const priced = pricePlanSelection(data, { choices: [[0, 1], [0]], plan: 'Week', slot: 'both', breakfast: false })
    expect(priced?.total).toBe(300000 + (2000 + 500) * 6)
    expect(priced?.detail).toBe('Lunch and dinner · Week · Rice · Roti · Juice')
  })

  it('takes a plan with no add-ons picked', () => {
    expect(pricePlanSelection(data, { choices: [[], []], plan: 'Week', slot: 'both', breakfast: false })?.total).toBe(300000)
  })

  it('still reads an older one-pick-per-group line', () => {
    const old = decodePlanSelection('both|Week|1|1.0')
    expect(old?.choices).toEqual([[1], [0]])
    expect(pricePlanSelection(data, old!)?.total).toBe(300000 + 2500 * 6)
  })

  it('reads an older one-person line and turns away an older line for more people', () => {
    expect(decodePlanSelection('both|Week|1|0+1.')).toEqual({ breakfast: false, choices: [[0, 1], []], plan: 'Week', slot: 'both' })
    expect(decodePlanSelection('both|Week|2|0+1.')).toBeNull()
  })

  it('rejects a repeated or unknown pick', () => {
    expect(pricePlanSelection(data, { choices: [[1, 1], []], plan: 'Week', slot: 'both', breakfast: false })).toBeNull()
    expect(pricePlanSelection(data, { choices: [[5], []], plan: 'Week', slot: 'both', breakfast: false })).toBeNull()
  })

  it('accepts no groups for a plan with no options', () => {
    const none = { ...data, optionGroups: [] } as PlanBuilderData
    const decoded = decodePlanSelection(encodePlanSelection({ choices: [], plan: 'Week', slot: 'both', breakfast: false }))!
    expect(pricePlanSelection(none, decoded)?.total).toBe(300000)
  })
})

describe('breakfast in a plan', () => {
  it('adds the breakfast price on top of lunch and dinner', () => {
    const priced = pricePlanSelection(data, { breakfast: true, choices: [[], []], plan: 'Week', slot: 'both' })
    expect(priced?.total).toBe(360000)
    expect(priced?.detail).toBe('Breakfast, lunch and dinner · Week')
  })

  it('sells breakfast on its own', () => {
    const priced = pricePlanSelection(data, { breakfast: true, choices: [[], []], plan: 'Week', slot: null })
    expect(priced?.total).toBe(60000)
    expect(priced?.detail).toBe('Breakfast · Week')
  })

  it('round-trips breakfast through the cart line, and older lines read as no breakfast', () => {
    const value = encodePlanSelection({ breakfast: true, choices: [[0], []], plan: 'Week', slot: 'lunch' })
    expect(value).toBe('breakfast+lunch|Week|0.')
    expect(decodePlanSelection(value)).toEqual({ breakfast: true, choices: [[0], []], plan: 'Week', slot: 'lunch' })
    expect(decodePlanSelection('breakfast|Week|.')).toMatchObject({ breakfast: true, slot: null })
    expect(decodePlanSelection('both|Week|.')).toMatchObject({ breakfast: false, slot: 'both' })
  })

  it('turns away no meals, a bad meal and a length without a breakfast price', () => {
    expect(decodePlanSelection('|Week|.')).toBeNull()
    expect(decodePlanSelection('lunch+breakfast|Week|.')).toBeNull()
    expect(decodePlanSelection('brunch|Week|.')).toBeNull()
    const noBreakfast = { ...data, plans: [{ days: 6, label: 'Week', note: '', prices: { both: 300000 } }] } as unknown as PlanBuilderData
    expect(pricePlanSelection(noBreakfast, { breakfast: true, choices: [[], []], plan: 'Week', slot: 'both' })).toBeNull()
  })
})

describe('meals offered', () => {
  const cases: [MealsOffered, string[]][] = [
    ['any', ['breakfast', 'lunch', 'dinner', 'both']],
    ['breakfast-lunch', ['breakfast', 'lunch']],
    ['breakfast-dinner', ['breakfast', 'dinner']],
    ['lunch-dinner', ['lunch', 'dinner', 'both']],
    ['breakfast', ['breakfast']],
    ['lunch', ['lunch']],
    ['dinner', ['dinner']],
  ]
  it.each(cases)('%s sells %j', (meals, slots) => {
    expect(allowedSlots(meals)).toEqual(slots)
  })

  it('offers only the meals in the combination that have a price', () => {
    const plans = [{ days: 6, label: 'Week', note: '', prices: { breakfast: 1, dinner: 1, lunch: 1 }, trial: false }]
    expect(offeredMeals({ meals: 'breakfast-dinner', plans })).toEqual(['breakfast', 'dinner'])
    expect(offeredMeals({ meals: 'lunch-dinner', plans })).toEqual(['lunch', 'dinner'])
    expect(offeredMeals({ meals: 'any', plans: [{ ...plans[0], prices: { lunch: 1 } }] })).toEqual(['lunch'])
  })
})

describe('offered meals need a price', () => {
  it('names an offered meal no length prices', () => {
    expect(unpricedMeals('breakfast-dinner', [{ dinnerPrice: 100 }])).toEqual(['breakfast'])
    expect(unpricedMeals('breakfast-dinner', [{ breakfastPrice: 50, dinnerPrice: 100 }])).toEqual([])
  })

  it('counts the lunch and dinner price for both meals, only when both are offered', () => {
    expect(unpricedMeals('lunch-dinner', [{ bothPrice: 100 }])).toEqual([])
    expect(unpricedMeals('any', [{ bothPrice: 100 }])).toEqual(['breakfast'])
    expect(unpricedMeals('lunch', [{ bothPrice: 100 }])).toEqual(['lunch'])
  })
})
