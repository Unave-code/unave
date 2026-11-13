/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'

import { readCheckoutIntent } from '../../src/collections/Orders/intent'
import { POST } from '../../src/app/(frontend)/api/cart/qty/route'
import type { CheckoutIntent } from '../../src/payload-types'
import { encodeCartLine, ONE_TIME_DURATION } from '../../src/utilities/cart'

/**
 * Two small machines the combo build touched, held without a database.
 *
 * A checkout intent is now a private row, not a set of gateway notes, so the
 * reader that turns a row back into an order checks it again: every quantity
 * must be a whole number from one to ten, and the stored total must be exactly
 * the sum of the lines. A row that fails either check writes no order.
 *
 * The quantity route rewrites the cookie and nothing else, so a Request with a
 * Cookie header is the whole test bench for it.
 */

const record = (overrides: Record<string, unknown> = {}): CheckoutIntent =>
  ({
    customer: 7,
    delivery: {
      addressLine1: '12 Test Road',
      city: 'Pune',
      foodPreference: 'none',
      name: 'Asha Kale',
      phone: '9876543210',
      pincode: '411001',
      state: 'Maharashtra',
    },
    expiresAt: '2026-12-12T00:00:00.000Z',
    gatewayOrderId: 'order_1',
    id: 1,
    items: [
      {
        days: 5,
        durationLabel: 'One week',
        product: 12,
        productId: 12,
        productTitle: 'Lunch plan',
        qty: 1,
        unitPrice: 150000,
      },
      {
        days: 0,
        durationLabel: ONE_TIME_DURATION,
        product: 34,
        productId: 34,
        productTitle: 'Phulka box',
        qty: 3,
        unitPrice: 4900,
      },
    ],
    total: 150000 + 3 * 4900,
    ...overrides,
  }) as unknown as CheckoutIntent

describe('reading a stored checkout intent', () => {
  it('keeps every line quantity and totals them', () => {
    const intent = readCheckoutIntent(record())

    expect(intent).not.toBeNull()
    expect(intent!.items.map((item) => item.qty)).toEqual([1, 3])
    expect(intent!.total).toBe(150000 + 3 * 4900)
  })

  it('carries a combo line and its frozen components', () => {
    const intent = readCheckoutIntent(
      record({
        items: [
          {
            components: [
              { days: 5, durationLabel: 'One week', product: 12, productId: 12, productTitle: 'Lunch plan' },
              { product: 34, productId: 34, productTitle: 'Phulka box' },
            ],
            days: 0,
            durationLabel: ONE_TIME_DURATION,
            product: 99,
            productId: 99,
            productTitle: 'Family combo',
            qty: 2,
            unitPrice: 99000,
          },
        ],
        total: 198000,
      }),
    )

    expect(intent).not.toBeNull()
    expect(intent!.items[0]?.components).toHaveLength(2)
    expect(intent!.items[0]?.components?.[0]).toMatchObject({
      days: 5,
      durationLabel: 'One week',
      productTitle: 'Lunch plan',
    })
  })

  it('refuses a stored total that does not equal its lines', () => {
    expect(readCheckoutIntent(record({ total: 1 }))).toBeNull()
  })

  it('refuses a line whose quantity cannot be trusted', () => {
    for (const qty of [0, -1, 2.5, 11]) {
      const bad = record({
        items: [
          {
            days: 0,
            durationLabel: ONE_TIME_DURATION,
            product: 34,
            productId: 34,
            productTitle: 'Phulka box',
            qty,
            unitPrice: 4900,
          },
        ],
        total: 4900 * (Number.isFinite(qty) ? qty : 0),
      })

      expect(readCheckoutIntent(bad)).toBeNull()
    }
  })

  it('refuses a record whose customer or delivery is unreadable', () => {
    expect(readCheckoutIntent(record({ customer: null }))).toBeNull()
    expect(readCheckoutIntent(record({ delivery: {} }))).toBeNull()
  })
})

describe('stepping a quantity at the qty route', () => {
  const cookieFor = (lines: unknown): string =>
    `unave-cart=${encodeURIComponent(JSON.stringify(lines))}`

  const post = async (
    cookie: string,
    fields: { delta: string; line?: string; return?: string },
  ): Promise<Response> =>
    POST(
      new Request('http://localhost:3000/api/cart/qty', {
        body: new URLSearchParams({
          delta: fields.delta,
          line: fields.line ?? encodeCartLine({ duration: ONE_TIME_DURATION, product: 'phulka-box' }),
          ...(fields.return ? { return: fields.return } : {}),
        }).toString(),
        headers: new Headers({
          'content-type': 'application/x-www-form-urlencoded',
          cookie,
          'sec-fetch-site': 'same-origin',
        }),
        method: 'POST',
      }),
    )

  const cookieOf = (response: Response): string => {
    const raw = response.headers.getSetCookie().find((value) => value.startsWith('unave-cart='))

    if (!raw) return ''

    return decodeURIComponent(raw.split(';')[0]!.slice('unave-cart='.length))
  }

  it('raises the quantity by one and answers a redirect with the cookie', async () => {
    const cart = [{ duration: ONE_TIME_DURATION, product: 'phulka-box', qty: 2 }]
    const response = await post(cookieFor(cart), { delta: '1' })

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('/cart')
    expect(JSON.parse(cookieOf(response))).toEqual([
      { duration: ONE_TIME_DURATION, product: 'phulka-box', qty: 3 },
    ])
  })

  it('lowers the quantity by one, resting at one', async () => {
    const cart = [{ duration: ONE_TIME_DURATION, product: 'phulka-box', qty: 1 }]
    const response = await post(cookieFor(cart), { delta: '-1' })

    expect(response.status).toBe(303)
    expect(JSON.parse(cookieOf(response))[0].qty).toBe(1)
  })

  it('never raises a line past the cap', async () => {
    const cart = [{ duration: ONE_TIME_DURATION, product: 'phulka-box', qty: 10 }]
    const response = await post(cookieFor(cart), { delta: '1' })

    expect(JSON.parse(cookieOf(response))[0].qty).toBe(10)
  })

  it('leaves every other line alone, and a line the cart does not hold leaves the cookie unchanged', async () => {
    const cart = [
      { duration: 'One week', product: 'lunch-plan', qty: 1 },
      { duration: ONE_TIME_DURATION, product: 'phulka-box', qty: 2 },
    ]
    const response = await post(cookieFor(cart), { delta: '1' })

    expect(JSON.parse(cookieOf(response))).toEqual([
      { duration: 'One week', product: 'lunch-plan', qty: 1 },
      { duration: ONE_TIME_DURATION, product: 'phulka-box', qty: 3 },
    ])

    const stranger = await post(cookieFor(cart), {
      delta: '1',
      line: encodeCartLine({ duration: 'One month', product: 'lunch-plan' }),
    })

    expect(JSON.parse(cookieOf(stranger))).toEqual(cart)
  })

  it('answers a posted nonsense without touching the basket', async () => {
    const cart = [{ duration: ONE_TIME_DURATION, product: 'phulka-box', qty: 2 }]
    const cookie = cookieFor(cart)

    const badDelta = await post(cookie, { delta: '3' })
    expect(badDelta.status).toBe(303)
    expect(badDelta.headers.getSetCookie()).toHaveLength(0)

    const badLine = await post(cookie, {
      delta: '1',
      line: 'not json',
    })
    expect(badLine.status).toBe(303)
    expect(badLine.headers.getSetCookie()).toHaveLength(0)
  })

  it('refuses a request that is not same origin', async () => {
    const response = await POST(
      new Request('http://localhost:3000/api/cart/qty', {
        body: new URLSearchParams({
          delta: '1',
          line: encodeCartLine({ duration: ONE_TIME_DURATION, product: 'phulka-box' }),
        }).toString(),
        headers: new Headers({ 'content-type': 'application/x-www-form-urlencoded' }),
        method: 'POST',
      }),
    )

    expect(response.status).toBe(303)
    expect(response.headers.getSetCookie()).toHaveLength(0)
  })
})
