import { describe, expect, it } from 'vitest'

import { readCheckoutIntent } from '@/collections/Orders/intent'
import type { CheckoutIntent, Product } from '@/payload-types'
import { addonsLabel, cleanAddonIds, pickAddons, productAddons } from '@/utilities/addons'
import {
  addOneTimeCartLine,
  cartLineKey,
  decodeCartLine,
  encodeCartLine,
  parseCartEntries,
} from '@/utilities/cart'
import { currentMenuWeek } from '@/utilities/planBuilder'

const addon = (id: number, title: string, price: number, available = true) =>
  ({ available, createdAt: '', id, price, title, updatedAt: '' }) as never

const oats = {
  addons: [addon(3, 'Almond milk', 4000), addon(7, 'Toast', 3000), addon(9, 'Honey', 2500, false)],
  type: 'one-time',
} as Pick<Product, 'addons' | 'type'>

describe('product add-ons', () => {
  it('offers only available add-ons, and none on a meal plan', () => {
    expect(productAddons(oats).map((a) => a.id)).toEqual([3, 7])
    expect(productAddons({ ...oats, type: 'plan' })).toEqual([])
  })

  it('picks offered ids and refuses paused or foreign ones', () => {
    expect(pickAddons(oats, [7, 3])?.map((a) => a.title)).toEqual(['Almond milk', 'Toast'])
    expect(pickAddons(oats, [])).toEqual([])
    expect(pickAddons(oats, [9])).toBeNull()
    expect(pickAddons(oats, [42])).toBeNull()
  })

  it('cleans ids: sorted, unique, positive, at most six', () => {
    expect(cleanAddonIds(['7', 3, 3, -1, 'x', 1.5])).toEqual([3, 7])
    expect(cleanAddonIds([1, 2, 3, 4, 5, 6, 7, 8])).toHaveLength(6)
  })

  it('labels the extras', () => {
    expect(addonsLabel([{ title: 'Almond milk' }, { title: 'Toast' }])).toBe('Almond milk, Toast')
    expect(addonsLabel([])).toBeNull()
  })
})

describe('cart lines with add-ons', () => {
  it('keys the same extras in any order as one line, and no extras as before', () => {
    const a = { addons: [7, 3], duration: 'one-time', product: 'oats' }
    const b = { addons: [3, 7], duration: 'one-time', product: 'oats' }
    expect(cartLineKey(a)).toBe(cartLineKey(b))
    expect(cartLineKey({ duration: 'one-time', product: 'oats' })).not.toBe(cartLineKey(a))
    expect(cartLineKey({ addons: [], duration: 'one-time', product: 'oats' })).toBe(
      cartLineKey({ duration: 'one-time', product: 'oats' }),
    )
  })

  it('keeps different extras on different lines and bumps matching ones', () => {
    let lines = addOneTimeCartLine([], 'oats', 1, 'one-time', [3]).lines
    lines = addOneTimeCartLine(lines, 'oats', 1, 'one-time').lines
    lines = addOneTimeCartLine(lines, 'oats', 2, 'one-time', [3]).lines
    expect(lines).toEqual([
      { addons: [3], duration: 'one-time', product: 'oats', qty: 3 },
      { duration: 'one-time', product: 'oats', qty: 1 },
    ])
  })

  it('round-trips the wire form and still reads the two element form', () => {
    const line = { addons: [3, 7], duration: 'one-time', product: 'oats' }
    expect(decodeCartLine(encodeCartLine(line))).toEqual(line)
    expect(encodeCartLine({ duration: 'one-time', product: 'oats' })).toBe('["oats","one-time"]')
    expect(decodeCartLine('["oats","one-time"]')).toEqual({ duration: 'one-time', product: 'oats' })
  })

  it('reads add-ons from the cookie and an old cookie without them', () => {
    const raw = encodeURIComponent(
      JSON.stringify([
        { addons: [7, 3, 3], duration: 'one-time', product: 'oats', qty: 2 },
        { duration: 'one-time', product: 'tea', qty: 1 },
      ]),
    )
    expect(parseCartEntries(raw)).toEqual([
      { addons: [3, 7], duration: 'one-time', product: 'oats', qty: 2 },
      { duration: 'one-time', product: 'tea', qty: 1 },
    ])
  })
})

describe('checkout intent with add-ons', () => {
  const intent = (item: Record<string, unknown>, total: number) =>
    ({
      customer: 5,
      delivery: {
        addressLine1: '1 Road',
        city: 'Pune',
        foodPreference: 'none',
        name: 'A',
        phone: '9876543210',
        pincode: '411001',
        state: 'MH',
      },
      id: 1,
      items: [{ days: 0, durationLabel: 'one-time', productId: 2, productRef: 2, productTitle: 'Oats', qty: 2, ...item }],
      total,
    }) as unknown as CheckoutIntent

  const extras = [
    { addonId: 3, addonRef: 3, price: 4000, title: 'Almond milk' },
    { addonId: 7, addonRef: 7, price: 3000, title: 'Toast' },
  ]

  it('accepts a unit price of the product plus its add-ons', () => {
    const read = readCheckoutIntent(intent({ addons: extras, basePrice: 14900, unitPrice: 21900 }, 43800))
    expect(read?.items[0].addons).toEqual([
      { addon: 3, price: 4000, title: 'Almond milk' },
      { addon: 7, price: 3000, title: 'Toast' },
    ])
  })

  it('refuses a unit price that does not add up', () => {
    expect(readCheckoutIntent(intent({ addons: extras, basePrice: 14900, unitPrice: 14900 }, 29800))).toBeNull()
  })

  it('refuses add-ons with no product price beside them', () => {
    expect(readCheckoutIntent(intent({ addons: extras, unitPrice: 21900 }, 43800))).toBeNull()
  })

  it('still reads an item from before add-ons', () => {
    expect(readCheckoutIntent(intent({ unitPrice: 14900 }, 29800))).not.toBeNull()
  })
})

describe('the meal plan menu week', () => {
  // 2026-11-25 is a Wednesday.
  it('dates Monday to Saturday of the current week, in India time', () => {
    const week = currentMenuWeek(new Date('2026-11-25T06:00:00Z'))
    expect(week.dates).toEqual(['23 Nov', '24 Nov', '25 Nov', '26 Nov', '27 Nov', '28 Nov'])
    expect(week.range).toBe('23 – 28 Nov')
  })

  it('moves to the coming week on a Sunday', () => {
    expect(currentMenuWeek(new Date('2026-11-29T06:00:00Z')).range).toBe('30 Nov – 5 Dec')
  })

  it('reads the day in India, not UTC', () => {
    // 20:00 UTC on Sunday 22 Nov is already Monday 23 Nov in India.
    expect(currentMenuWeek(new Date('2026-11-22T20:00:00Z')).dates[0]).toBe('23 Nov')
  })
})
