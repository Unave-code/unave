/**
 * @vitest-environment node
 */
import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import type { Product } from '@/payload-types'
import {
  addCartLine,
  CART_MAX_LINES,
  cartLineKey,
  decodeCartLine,
  encodeCartLine,
  normalizeCartLines,
  parseCartEntries,
  readCartFromHeaders,
  removeCartLine,
} from '@/utilities/cart'
import { productDuration, resolveCartLines } from '@/utilities/cartLines'

/**
 * The cart's two rules (spec 0007, AC-2, AC-3 and AC-5).
 *
 * The cookie carries only a product slug and a duration label. These tests hold
 * the reading of it: junk is dropped, a rendering cart is deduped and capped,
 * a tampered cart keeps its duplicates and overflow so the order endpoint can
 * refuse them, and every price and day count comes from the live product record.
 */

const encode = (value: unknown): string => encodeURIComponent(JSON.stringify(value))

const product = {
  available: true,
  durations: [
    { days: 5, id: 'one-week', label: 'One week', price: 150000 },
    { days: 22, id: 'one-month', label: 'One month', price: 660000 },
  ],
  id: 1,
  slug: 'lunch-plan',
  title: 'Lunch plan',
} as unknown as Product

const secondProduct = {
  ...product,
  durations: [{ days: 7, id: 'dinner', label: 'One week', price: 99000 }],
  id: 2,
  slug: 'dinner-plan',
  title: 'Dinner plan',
} as unknown as Product

describe('reading the cookie value', () => {
  it('returns nothing for a missing, malformed or non-array value', () => {
    expect(parseCartEntries(undefined)).toEqual([])
    expect(parseCartEntries('')).toEqual([])
    expect(parseCartEntries('not-json')).toEqual([])
    expect(parseCartEntries(encode({ product: 'lunch-plan' }))).toEqual([])
  })

  it('keeps the readable lines and drops entries without both parts', () => {
    const raw = encode([
      { duration: 'One week', product: 'lunch-plan' },
      { duration: '', product: 'dinner-plan' },
      { duration: 'One month' },
      null,
      'junk',
    ])

    expect(parseCartEntries(raw)).toEqual([{ duration: 'One week', product: 'lunch-plan' }])
  })

  it('keeps duplicates and overflow for the order endpoint to refuse', () => {
    const line = { duration: 'One week', product: 'lunch-plan' }
    const entries = parseCartEntries(encode(Array.from({ length: 12 }, () => line)))

    expect(entries).toHaveLength(12)
  })

  it('renders at most ten distinct lines', () => {
    const lines = Array.from({ length: 12 }, (_, index) => ({
      duration: `Duration ${index}`,
      product: `product-${index}`,
    }))
    const normalized = normalizeCartLines([...lines, lines[0]])

    expect(normalized).toHaveLength(CART_MAX_LINES)
    expect(normalizeCartLines([lines[0], lines[0]])).toEqual([lines[0]])
  })

  it('reads a cart from a Cookie header, ignoring other cookies', () => {
    const raw = encode([{ duration: 'One week', product: 'lunch-plan' }])

    expect(readCartFromHeaders(`unave-customer=abc; unave-cart=${raw}; other=1`)).toEqual([
      { duration: 'One week', product: 'lunch-plan' },
    ])
  })
})

describe('adding and removing lines', () => {
  const oneWeek = { duration: 'One week', product: 'lunch-plan' }

  it('adds a line the cart does not have', () => {
    expect(addCartLine([], oneWeek)).toEqual({ lines: [oneWeek], ok: true })
  })

  it('refuses the same product and duration twice', () => {
    expect(addCartLine([oneWeek], oneWeek)).toEqual({
      lines: [oneWeek],
      ok: false,
      reason: 'duplicate',
    })
  })

  it('allows the same product at another duration', () => {
    const result = addCartLine([oneWeek], { duration: 'One month', product: 'lunch-plan' })

    expect(result.ok).toBe(true)
    expect(result.lines).toHaveLength(2)
  })

  it('refuses an eleventh line', () => {
    const lines = Array.from({ length: CART_MAX_LINES }, (_, index) => ({
      duration: `Duration ${index}`,
      product: `product-${index}`,
    }))

    expect(addCartLine(lines, { duration: 'One more', product: 'extra' })).toEqual({
      lines,
      ok: false,
      reason: 'full',
    })
  })

  it('removes exactly the named line', () => {
    const other = { duration: 'One month', product: 'lunch-plan' }

    expect(removeCartLine([oneWeek, other], cartLineKey(other))).toEqual([oneWeek])
  })

  it('carries a line through a form field as JSON and back', () => {
    const weird = { duration: 'One week & "spicy"', product: 'lunch-plan' }
    const decoded = decodeCartLine(encodeCartLine(weird))

    expect(decoded).toEqual(weird)
    expect(removeCartLine([oneWeek, weird], cartLineKey(decoded!))).toEqual([oneWeek])
    expect(decodeCartLine('not json')).toBeNull()
    expect(decodeCartLine('["only-one"]')).toBeNull()
    expect(decodeCartLine('["", "One week"]')).toBeNull()
  })
})

describe('resolving the cart against the live records', () => {
  const payloadServing = (rows: Product[]): Payload =>
    ({
      find: vi.fn().mockResolvedValue({ docs: rows }),
    }) as unknown as Payload

  it('reads title, days and price from the record, never from the cookie', async () => {
    const result = await resolveCartLines({
      lines: [{ duration: 'One month', product: 'lunch-plan' }],
      payload: payloadServing([product]),
    })

    expect(result.usable).toHaveLength(1)
    expect(result.usable[0]).toMatchObject({
      days: 22,
      price: 660000,
      productTitle: 'Lunch plan',
      stale: false,
    })
    expect(result.total).toBe(660000)
  })

  it('sums every usable line', async () => {
    const result = await resolveCartLines({
      lines: [
        { duration: 'One week', product: 'lunch-plan' },
        { duration: 'One week', product: 'dinner-plan' },
      ],
      payload: payloadServing([product, secondProduct]),
    })

    expect(result.usable).toHaveLength(2)
    expect(result.total).toBe(249000)
  })

  it('marks an unknown product, a paused product and a missing duration stale, and leaves them out of the total', async () => {
    const paused = { ...secondProduct, available: false } as Product

    const result = await resolveCartLines({
      lines: [
        { duration: 'One week', product: 'lunch-plan' },
        { duration: 'One week', product: 'gone' },
        { duration: 'One week', product: 'dinner-plan' },
        { duration: 'Two weeks', product: 'lunch-plan' },
      ],
      payload: payloadServing([product, paused]),
    })

    expect(result.usable).toHaveLength(1)
    expect(result.stale.map((line) => line.reason)).toEqual([
      'unknown-product',
      'paused',
      'missing-duration',
    ])
    expect(result.total).toBe(150000)
  })

  it('asks for each slug once, even when a product appears at two durations', async () => {
    const payload = payloadServing([product])

    await resolveCartLines({
      lines: [
        { duration: 'One week', product: 'lunch-plan' },
        { duration: 'One month', product: 'lunch-plan' },
      ],
      payload,
    })

    expect(payload.find).toHaveBeenCalledTimes(1)
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: { in: ['lunch-plan'] } } }),
    )
  })

  it('matches a duration label case insensitively and trims it', () => {
    expect(productDuration(product, '  one month  ')).toEqual({
      days: 22,
      label: 'One month',
      price: 660000,
    })
    expect(productDuration(product, 'Two weeks')).toBeNull()
    expect(productDuration(null, 'One week')).toBeNull()
  })
})
