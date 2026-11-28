import { describe, expect, it } from 'vitest'

import deepMerge from '@/utilities/deepMerge'
import { FOOD_PREFERENCES, foodPreferenceLabel, isFoodPreference } from '@/utilities/foodPreference'
import { leadPricePaise } from '@/utilities/leadPrice'
import { hasComboItems, isMealPlan, isSingleItem, productTypeFor } from '@/utilities/productKind'
import { WHATSAPP_MESSAGE, whatsappHref } from '@/utilities/whatsapp'

/** Small pure helpers that had no suite of their own. */

describe('productKind', () => {
  it('reads the two ticks into a stored type', () => {
    expect(productTypeFor({})).toBe('one-time')
    expect(productTypeFor({ combo: true })).toBe('combo')
    expect(productTypeFor({ mealPlan: true })).toBe('plan')
    expect(productTypeFor({ combo: true, mealPlan: true })).toBe('plan')
  })

  it('falls back to the stored type for records written before the ticks', () => {
    expect(isMealPlan({ type: 'plan' })).toBe(true)
    expect(hasComboItems({ type: 'combo' })).toBe(true)
    expect(isSingleItem({ type: 'one-time' })).toBe(true)
  })

  it('lets an explicit tick win over a stale type', () => {
    expect(isMealPlan({ mealPlan: false, type: 'plan' })).toBe(false)
    expect(hasComboItems({ combo: false, type: 'combo' })).toBe(false)
  })

  it('reads a missing product as a single item', () => {
    expect(isSingleItem(null)).toBe(true)
    expect(isSingleItem(undefined)).toBe(true)
  })
})

describe('leadPricePaise', () => {
  it('leads with the one price of a single item or combo', () => {
    expect(leadPricePaise({ price: 25000, type: 'one-time' })).toBe(25000)
    expect(leadPricePaise({ price: 90000, type: 'combo' })).toBe(90000)
  })

  it('has no lead price for a zero or missing price', () => {
    expect(leadPricePaise({ price: 0, type: 'one-time' })).toBeNull()
    expect(leadPricePaise({ price: null, type: 'combo' })).toBeNull()
  })

  it('leads a meal plan with its cheapest priced duration', () => {
    const durations = [{ price: 300000 }, { price: 120000 }, { price: 0 }] as never
    expect(leadPricePaise({ durations, type: 'plan' })).toBe(120000)
  })

  it('has no lead price for a meal plan with no priced duration', () => {
    expect(leadPricePaise({ durations: [], type: 'plan' })).toBeNull()
    expect(leadPricePaise({ type: 'plan' })).toBeNull()
  })
})

describe('whatsappHref', () => {
  it('keeps only the digits of the number and appends the opening line', () => {
    expect(whatsappHref('+91 98765-43210')).toBe(
      `https://wa.me/919876543210?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`,
    )
  })

  it('leaves the text off when there is no message', () => {
    expect(whatsappHref('919876543210', null)).toBe('https://wa.me/919876543210')
    expect(whatsappHref('919876543210', '   ')).toBe('https://wa.me/919876543210')
  })

  it('encodes a custom message', () => {
    expect(whatsappHref('91', 'Order #12 & more?')).toBe('https://wa.me/91?text=Order%20%2312%20%26%20more%3F')
  })
})

describe('foodPreference', () => {
  it('lists every preference in Payload options shape, "none" first', () => {
    expect(FOOD_PREFERENCES[0]).toEqual({ label: 'No preference', value: 'none' })
    expect(FOOD_PREFERENCES.map((option) => option.value)).toEqual([
      'none',
      'vegetarian',
      'vegan',
      'eggetarian',
      'non-vegetarian',
    ])
  })

  it('recognises only the known values', () => {
    expect(isFoodPreference('vegan')).toBe(true)
    expect(isFoodPreference('Vegan')).toBe(false)
    expect(isFoodPreference(1)).toBe(false)
  })

  it('reads an unknown or empty value as no preference', () => {
    expect(foodPreferenceLabel('eggetarian')).toBe('Eggetarian')
    expect(foodPreferenceLabel('')).toBe('No preference')
    expect(foodPreferenceLabel(undefined)).toBe('No preference')
  })
})

describe('deepMerge', () => {
  it('merges nested objects without touching the inputs', () => {
    const target = { admin: { description: 'a', width: '50%' }, name: 'link' }
    const source = { admin: { width: '100%' } }

    expect(deepMerge(target, source)).toEqual({ admin: { description: 'a', width: '100%' }, name: 'link' })
    expect(target.admin.width).toBe('50%')
  })

  it('adds keys the target does not have', () => {
    expect(deepMerge({ a: 1 }, { b: { c: 2 } })).toEqual({ a: 1, b: { c: 2 } })
  })

  it('replaces arrays rather than merging them', () => {
    expect(deepMerge({ list: [1, 2, 3] }, { list: [9] })).toEqual({ list: [9] })
  })

  // `typeof null === 'object'`, so isObject must exclude null or the merge recurses into it and throws.
  it('lets an override set a nested key to null', () => {
    expect(() => deepMerge({ admin: { width: '50%' } }, { admin: null })).not.toThrow()
    expect(deepMerge({ admin: { width: '50%' } }, { admin: null })).toEqual({ admin: null })
  })
})
