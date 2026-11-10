/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'

import { buildOrderNotes, readOrderNotes, type OrderIntentItem } from '../../src/collections/Orders/intent'
import { POST } from '../../src/app/(frontend)/api/cart/qty/route'
import { encodeCartLine, ONE_TIME_DURATION } from '../../src/utilities/cart'

/**
 * Two small machines the one-time build added, held without a database.
 *
 * The checkout intent rides the gateway order's notes, so a quantity must
 * survive the trip out and back: a six element line carries it, an older five
 * element line reads as one, and a line with a quantity that cannot be trusted
 * refuses the whole pack. The quantity route rewrites the cookie and nothing
 * else, so a Request with a Cookie header is the whole test bench.
 */

const planItem: OrderIntentItem = {
  days: 5,
  durationLabel: 'One week',
  productId: 12,
  productTitle: 'Lunch plan',
  unitPrice: 150000,
}

const oneTimeItem: OrderIntentItem = {
  days: 0,
  durationLabel: ONE_TIME_DURATION,
  productId: 34,
  productTitle: 'Phulka box',
  qty: 3,
  unitPrice: 4900,
}

describe('packing the checkout intent', () => {
  it('round trips quantities, and totals them into the intent', () => {
    const notes = buildOrderNotes({
      customerId: 7,
      delivery: { name: 'Asha Kale', phone: '9876543210' },
      items: [planItem, oneTimeItem],
    })

    const intent = readOrderNotes(notes)

    expect(intent).not.toBeNull()
    expect(intent!.items.map((item) => item.qty)).toEqual([1, 3])
    expect(intent!.total).toBe(150000 + 3 * 4900)
  })

  it('reads an older five element line as quantity one', () => {
    const intent = readOrderNotes({
      c: '7',
      l0: JSON.stringify([[12, 'One week', 5, 150000, 'Lunch plan']]),
    })

    expect(intent).not.toBeNull()
    expect(intent!.items).toHaveLength(1)
    expect(intent!.items[0]).toMatchObject({ productTitle: 'Lunch plan', qty: 1 })
    expect(intent!.total).toBe(150000)
  })

  it('refuses a packed line whose quantity cannot be trusted', () => {
    const base = [12, 'One week', 5, 150000, 'Lunch plan']

    expect(readOrderNotes({ c: '7', l0: JSON.stringify([[...base, 'junk']]) })).toBeNull()
    expect(readOrderNotes({ c: '7', l0: JSON.stringify([[...base, 0]]) })).toBeNull()
    expect(readOrderNotes({ c: '7', l0: JSON.stringify([[...base, -1]]) })).toBeNull()
    expect(readOrderNotes({ c: '7', l0: JSON.stringify([[...base, 2.5]]) })).toBeNull()
  })

  it('refuses a pack of an unreadable shape, as before', () => {
    expect(readOrderNotes({ c: '7', l0: JSON.stringify([[12, 'One week', 5, 150000]]) })).toBeNull()
    expect(readOrderNotes({ c: '7', l0: 'not json' })).toBeNull()
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
