import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import type { Product } from '@/payload-types'
import { addOneTimeCartLine, ONE_TIME_DURATION } from '@/utilities/cart'
import { productSize, productSizes, resolveCartLines } from '@/utilities/cartLines'
import { isOneTimeOrderItem, orderItemKind } from '@/utilities/orderDisplay'

/**
 * One-time products sold in sizes: each size is its own cart line, priced on
 * the server from the size the line names, and recorded on the order by its
 * label.
 */

const podi = {
  available: true,
  id: 7,
  price: 9900,
  sizes: [
    { compareAtPrice: 12000, id: 's1', label: '250 g', price: 9900 },
    { compareAtPrice: null, id: 's2', label: '500 g', price: 18000 },
  ],
  slug: 'sambar-podi',
  title: 'Sambar podi',
  type: 'one-time',
} as unknown as Product

const fakePayload = (docs: Product[]) =>
  ({ find: async () => ({ docs }) }) as unknown as Payload

describe('product sizes', () => {
  it('lists the sizes and finds one by its label, ignoring case', () => {
    expect(productSizes(podi).map((size) => size.label)).toEqual(['250 g', '500 g'])
    expect(productSize(podi, '500 G')?.price).toBe(18000)
    expect(productSize(podi, '1 kg')).toBeNull()
  })

  it('keeps each size on its own cart line', () => {
    const first = addOneTimeCartLine([], 'sambar-podi', 1, '250 g')
    const second = addOneTimeCartLine(first.lines, 'sambar-podi', 2, '500 g')

    expect(second.lines).toEqual([
      { duration: '250 g', product: 'sambar-podi', qty: 1 },
      { duration: '500 g', product: 'sambar-podi', qty: 2 },
    ])
  })

  it('prices a sized line from its size, and marks an unknown size stale', async () => {
    const cart = await resolveCartLines({
      lines: [
        { duration: '500 g', product: 'sambar-podi', qty: 2 },
        { duration: ONE_TIME_DURATION, product: 'sambar-podi', qty: 1 },
      ],
      payload: fakePayload([podi]),
    })

    expect(cart.all[0]).toMatchObject({ lineTotal: 36000, price: 18000, size: '500 g', stale: false })
    // A sized product never sells at the plain one-time line.
    expect(cart.all[1].stale).toBe(true)
    expect(cart.total).toBe(36000)
  })
})

describe('order items', () => {
  it('reads a sized item as a one-time purchase of that size', () => {
    const item = { days: 0, durationLabel: '500 g' }

    expect(isOneTimeOrderItem(item)).toBe(true)
    expect(orderItemKind(item)).toBe('One-time purchase · 500 g')
  })

  it('keeps plans, plain one-time items and combos as they were', () => {
    expect(orderItemKind({ days: 7, durationLabel: 'One week' })).toBe('One week')
    expect(isOneTimeOrderItem({ days: 7, durationLabel: 'One week' })).toBe(false)
    expect(orderItemKind({ days: 0, durationLabel: ONE_TIME_DURATION })).toBe('One-time purchase')
    expect(
      orderItemKind({ components: [{ productTitle: 'Box' }], days: 0, durationLabel: ONE_TIME_DURATION }),
    ).toBe('Meal combo')
  })
})
