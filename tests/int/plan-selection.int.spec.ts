import { describe, expect, it } from 'vitest'

import { decodePlanSelection, encodePlanSelection, type PlanBuilderData, pricePlanSelection } from '@/utilities/planBuilder'

const data = {
  optionGroups: [
    { choices: [{ detail: '', extraPerDay: 0, label: 'Rice' }, { detail: '', extraPerDay: 2000, label: 'Roti' }], hint: '', title: 'Carb' },
    { choices: [{ detail: '', extraPerDay: 500, label: 'Juice' }], hint: '', title: 'Extra' },
  ],
  plans: [{ days: 6, label: 'Week', note: '', prices: { both: 300000 } }],
} as unknown as PlanBuilderData

describe('plan selection with add-ons', () => {
  it('round-trips several picks per group and none', () => {
    const value = encodePlanSelection({ choices: [[0, 1], []], people: 2, plan: 'Week', slot: 'both' })
    expect(value).toBe('both|Week|2|0+1.')
    expect(decodePlanSelection(value)?.choices).toEqual([[0, 1], []])
  })

  it('prices every picked add-on per day per person', () => {
    const priced = pricePlanSelection(data, { choices: [[0, 1], [0]], people: 2, plan: 'Week', slot: 'both' })
    expect(priced?.total).toBe((300000 + (2000 + 500) * 6) * 2)
    expect(priced?.detail).toContain('Rice · Roti · Juice')
  })

  it('takes a plan with no add-ons picked', () => {
    expect(pricePlanSelection(data, { choices: [[], []], people: 1, plan: 'Week', slot: 'both' })?.total).toBe(300000)
  })

  it('still reads an older one-pick-per-group line', () => {
    const old = decodePlanSelection('both|Week|1|1.0')
    expect(old?.choices).toEqual([[1], [0]])
    expect(pricePlanSelection(data, old!)?.total).toBe(300000 + 2500 * 6)
  })

  it('rejects a repeated or unknown pick', () => {
    expect(pricePlanSelection(data, { choices: [[1, 1], []], people: 1, plan: 'Week', slot: 'both' })).toBeNull()
    expect(pricePlanSelection(data, { choices: [[5], []], people: 1, plan: 'Week', slot: 'both' })).toBeNull()
  })

  it('accepts no groups for a plan with no options', () => {
    const none = { ...data, optionGroups: [] } as PlanBuilderData
    const decoded = decodePlanSelection(encodePlanSelection({ choices: [], people: 1, plan: 'Week', slot: 'both' }))!
    expect(pricePlanSelection(none, decoded)?.total).toBe(300000)
  })
})
