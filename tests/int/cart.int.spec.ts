/**
 * @vitest-environment node
 */
import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import type { Product } from '@/payload-types'
import {
  addCartLine,
  addOneTimeCartLine,
  CART_MAX_LINES,
  CART_MAX_QTY,
  cartLineKey,
  decodeCartLine,
  encodeCartLine,
  isValidCartQuantity,
  normalizeCartLines,
  ONE_TIME_DURATION,
  parseCartEntries,
  readCartFromHeaders,
  removeCartLine,
} from '@/utilities/cart'
import { productDuration, resolveCartLines } from '@/utilities/cartLines'

/**
 * The cart's rules (spec 0007, AC-2, AC-3 and AC-5, plus the one-time build).
 *
 * The cookie carries only a product slug, a duration label and a quantity.
 * These tests hold the reading of it: junk is dropped, a rendering cart is
 * deduped, capped and quantity-clamped, a tampered cart keeps its duplicates,
 * overflow and out-of-range quantities so the order endpoint can refuse them,
 * and every price and day count comes from the live product record — through a
 * duration for a meal plan, through the single price for a one-time purchase.
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
  type: 'plan',
} as unknown as Product

const secondProduct = {
  ...product,
  durations: [{ days: 7, id: 'dinner', label: 'One week', price: 99000 }],
  id: 2,
  slug: 'dinner-plan',
  title: 'Dinner plan',
} as unknown as Product

const oneTimeProduct = {
  available: true,
  durations: [],
  id: 3,
  price: 4900,
  slug: 'phulka-box',
  title: 'Phulka box',
  type: 'one-time',
} as unknown as Product

const comboProduct = {
  available: true,
  components: [{ product: oneTimeProduct }, { durationLabel: 'One week', product }],
  durations: [],
  id: 5,
  price: 99000,
  slug: 'family-combo',
  title: 'Family combo',
  type: 'combo',
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

    expect(parseCartEntries(raw)).toEqual([
      { duration: 'One week', product: 'lunch-plan', qty: 1 },
    ])
  })

  it('reads an absent or unreadable quantity as one', () => {
    const raw = encode([
      { duration: 'One week', product: 'lunch-plan' },
      { duration: 'One week', product: 'dinner-plan', qty: 'junk' },
      { duration: 'One month', product: 'lunch-plan', qty: 0 },
      { duration: 'One month', product: 'dinner-plan', qty: -2 },
    ])

    expect(parseCartEntries(raw).map((line) => line.qty)).toEqual([1, 1, 1, 1])
  })

  it('keeps a finite quantity of one or more exactly as written, for the endpoint to judge', () => {
    const raw = encode([
      { duration: 'One week', product: 'lunch-plan', qty: 3 },
      { duration: 'One week', product: 'dinner-plan', qty: 2.5 },
      { duration: 'One month', product: 'lunch-plan', qty: 99 },
    ])

    expect(parseCartEntries(raw).map((line) => line.qty)).toEqual([3, 2.5, 99])
    expect(isValidCartQuantity(3)).toBe(true)
    expect(isValidCartQuantity(2.5)).toBe(false)
    expect(isValidCartQuantity(99)).toBe(false)
    expect(isValidCartQuantity(0)).toBe(false)
    expect(isValidCartQuantity('junk')).toBe(false)
    expect(isValidCartQuantity(CART_MAX_QTY)).toBe(true)
  })

  it('keeps duplicates and overflow for the order endpoint to refuse', () => {
    const line = { duration: 'One week', product: 'lunch-plan', qty: 1 }
    const entries = parseCartEntries(encode(Array.from({ length: 12 }, () => line)))

    expect(entries).toHaveLength(12)
  })

  it('renders at most ten distinct lines, quantities clamped to the cap', () => {
    const lines = Array.from({ length: 12 }, (_, index) => ({
      duration: `Duration ${index}`,
      product: `product-${index}`,
      qty: 99,
    }))
    const normalized = normalizeCartLines([...lines, lines[0]])

    expect(normalized).toHaveLength(CART_MAX_LINES)
    expect(normalized.every((line) => line.qty === CART_MAX_QTY)).toBe(true)
    expect(normalizeCartLines([lines[0], lines[0]])).toHaveLength(1)
  })

  it('renders a fractional quantity as a whole number between one and the cap', () => {
    const normalized = normalizeCartLines([
      { duration: 'One week', product: 'lunch-plan', qty: 2.5 },
    ])

    expect(normalized[0].qty).toBe(3)
  })

  it('reads a cart from a Cookie header, ignoring other cookies', () => {
    const raw = encode([{ duration: 'One week', product: 'lunch-plan' }])

    expect(readCartFromHeaders(`unave-customer=abc; unave-cart=${raw}; other=1`)).toEqual([
      { duration: 'One week', product: 'lunch-plan', qty: 1 },
    ])
  })
})

describe('adding and removing lines', () => {
  const oneWeek = { duration: 'One week', product: 'lunch-plan' }

  it('adds a line the cart does not have, at quantity one', () => {
    expect(addCartLine([], oneWeek)).toEqual({
      lines: [{ duration: 'One week', product: 'lunch-plan', qty: 1 }],
      ok: true,
    })
  })

  it('refuses the same product and duration twice', () => {
    const cart = [{ duration: 'One week', product: 'lunch-plan', qty: 1 }]

    expect(addCartLine(cart, oneWeek)).toEqual({
      lines: cart,
      ok: false,
      reason: 'duplicate',
    })
  })

  it('allows the same product at another duration', () => {
    const result = addCartLine(
      [{ duration: 'One week', product: 'lunch-plan', qty: 1 }],
      { duration: 'One month', product: 'lunch-plan' },
    )

    expect(result.ok).toBe(true)
    expect(result.lines).toHaveLength(2)
  })

  it('refuses an eleventh line', () => {
    const lines = Array.from({ length: CART_MAX_LINES }, (_, index) => ({
      duration: `Duration ${index}`,
      product: `product-${index}`,
      qty: 1,
    }))

    expect(addCartLine(lines, { duration: 'One more', product: 'extra' })).toEqual({
      lines,
      ok: false,
      reason: 'full',
    })
  })

  it('adds a one-time product as the reserved duration at quantity one', () => {
    const result = addOneTimeCartLine([], 'phulka-box')

    expect(result.ok).toBe(true)
    expect(result.lines).toEqual([
      { duration: ONE_TIME_DURATION, product: 'phulka-box', qty: 1 },
    ])
  })

  it('bumps the quantity when the one-time product is already in the cart', () => {
    const cart = [{ duration: ONE_TIME_DURATION, product: 'phulka-box', qty: 2 }]
    const result = addOneTimeCartLine(cart, 'phulka-box')

    expect(result.ok).toBe(true)
    expect(result.lines[0].qty).toBe(3)
    expect(result.lines).toHaveLength(1)
  })

  it('refuses a one-time add at the quantity cap', () => {
    const cart = [{ duration: ONE_TIME_DURATION, product: 'phulka-box', qty: CART_MAX_QTY }]

    expect(addOneTimeCartLine(cart, 'phulka-box')).toEqual({
      lines: cart,
      ok: false,
      reason: 'quantity',
    })
  })

  it('never merges a one-time line into a plan line of the same product', () => {
    const cart = [{ duration: 'One week', product: 'phulka-box', qty: 1 }]

    // A plan line for the same slug carries a staff-written duration, never
    // the reserved value, so the two are different lines by key.
    const result = addOneTimeCartLine(cart, 'phulka-box')

    expect(result.ok).toBe(true)
    expect(result.lines).toHaveLength(2)
  })

  it('removes exactly the named line', () => {
    const other = { duration: 'One month', product: 'lunch-plan', qty: 1 }

    expect(
      removeCartLine(
        [{ duration: 'One week', product: 'lunch-plan', qty: 1 }, other],
        cartLineKey(other),
      ),
    ).toEqual([{ duration: 'One week', product: 'lunch-plan', qty: 1 }])
  })

  it('carries a line through a form field as JSON and back', () => {
    const weird = { duration: 'One week & "spicy"', product: 'lunch-plan' }
    const decoded = decodeCartLine(encodeCartLine(weird))

    expect(decoded).toEqual(weird)
    expect(
      removeCartLine(
        [{ duration: 'One week', product: 'lunch-plan', qty: 1 }, { ...weird, qty: 4 }],
        cartLineKey(decoded!),
      ),
    ).toEqual([{ duration: 'One week', product: 'lunch-plan', qty: 1 }])
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
      lines: [{ duration: 'One month', product: 'lunch-plan', qty: 1 }],
      payload: payloadServing([product]),
    })

    expect(result.usable).toHaveLength(1)
    expect(result.usable[0]).toMatchObject({
      days: 22,
      lineTotal: 660000,
      price: 660000,
      productTitle: 'Lunch plan',
      qty: 1,
      stale: false,
      type: 'plan',
    })
    expect(result.total).toBe(660000)
  })

  it('sums every usable line', async () => {
    const result = await resolveCartLines({
      lines: [
        { duration: 'One week', product: 'lunch-plan', qty: 1 },
        { duration: 'One week', product: 'dinner-plan', qty: 1 },
      ],
      payload: payloadServing([product, secondProduct]),
    })

    expect(result.usable).toHaveLength(2)
    expect(result.total).toBe(249000)
  })

  it('charges a one-time purchase through the price on the record, times the quantity', async () => {
    const result = await resolveCartLines({
      lines: [
        { duration: ONE_TIME_DURATION, product: 'phulka-box', qty: 3 },
        { duration: 'One week', product: 'lunch-plan', qty: 1 },
      ],
      payload: payloadServing([oneTimeProduct, product]),
    })

    expect(result.usable).toHaveLength(2)
    expect(result.usable[0]).toMatchObject({
      days: null,
      lineTotal: 14700,
      price: 4900,
      productTitle: 'Phulka box',
      qty: 3,
      type: 'one-time',
    })
    expect(result.total).toBe(164700)
  })

  it('marks a one-time line stale when its duration is not the reserved value or the record has no price', async () => {
    const unpriced = {
      ...oneTimeProduct,
      id: 4,
      price: undefined,
      slug: 'unpriced-box',
      title: 'Unpriced box',
    } as unknown as Product

    const result = await resolveCartLines({
      lines: [
        { duration: 'One week', product: 'phulka-box', qty: 1 },
        { duration: ONE_TIME_DURATION, product: 'unpriced-box', qty: 2 },
      ],
      payload: payloadServing([oneTimeProduct, unpriced]),
    })

    expect(result.usable).toHaveLength(0)
    expect(result.stale.map((line) => line.reason)).toEqual(['missing-duration', 'missing-duration'])
    expect(result.total).toBe(0)
  })

  it('marks an unknown product, a paused product and a missing duration stale, and leaves them out of the total', async () => {
    const paused = { ...secondProduct, available: false } as Product

    const result = await resolveCartLines({
      lines: [
        { duration: 'One week', product: 'lunch-plan', qty: 1 },
        { duration: 'One week', product: 'gone', qty: 1 },
        { duration: 'One week', product: 'dinner-plan', qty: 1 },
        { duration: 'Two weeks', product: 'lunch-plan', qty: 1 },
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

  it('asks for each slug once, even when a product appears at two durations', async () => {    const payload = payloadServing([product])

    await resolveCartLines({
      lines: [
        { duration: 'One week', product: 'lunch-plan', qty: 1 },
        { duration: 'One month', product: 'lunch-plan', qty: 1 },
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

  it('charges a combo through its own price, times the quantity, and keeps its contents', async () => {
    const result = await resolveCartLines({
      lines: [{ duration: ONE_TIME_DURATION, product: 'family-combo', qty: 2 }],
      payload: payloadServing([comboProduct]),
    })

    expect(result.usable).toHaveLength(1)
    expect(result.usable[0]).toMatchObject({
      days: 0,
      lineTotal: 198000,
      price: 99000,
      productTitle: 'Family combo',
      qty: 2,
      stale: false,
      type: 'combo',
    })
    expect(result.usable[0]?.components).toHaveLength(2)
    expect(result.total).toBe(198000)
  })

  it('marks a combo stale when a product inside it is paused or the line carries another duration', async () => {
    const broken = {
      ...comboProduct,
      components: [
        { product: { ...oneTimeProduct, available: false } },
        { durationLabel: 'One week', product },
      ],
      id: 6,
      slug: 'broken-combo',
      title: 'Broken combo',
    } as unknown as Product

    const result = await resolveCartLines({
      lines: [
        { duration: 'One week', product: 'family-combo', qty: 1 },
        { duration: ONE_TIME_DURATION, product: 'broken-combo', qty: 1 },
      ],
      payload: payloadServing([comboProduct, broken]),
    })

    expect(result.usable).toHaveLength(0)
    expect(result.stale.map((line) => line.reason)).toEqual(['missing-duration', 'paused'])
    expect(result.total).toBe(0)
  })
})
