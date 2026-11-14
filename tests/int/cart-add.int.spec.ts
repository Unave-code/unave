/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const payloadFind = vi.hoisted(() => vi.fn())

vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()

  return {
    ...actual,
    getPayload: vi.fn().mockResolvedValue({ find: payloadFind }),
  }
})

import { POST } from '@/app/(frontend)/api/cart/add/route'
import { ONE_TIME_DURATION } from '@/utilities/cart'

const weeklyPlan = {
  available: true,
  durations: [{ days: 7, id: 'week', label: 'One week', price: 35000 }],
  slug: 'weekly-plan',
  type: 'plan',
}

const oneTimeProduct = {
  available: true,
  price: 5000,
  slug: 'rice-box',
  type: 'one-time',
}

const post = (
  fields: Record<string, string>,
  lines: Array<{ duration: string; product: string; qty: number }> = [],
): Promise<Response> => {
  const headers = new Headers({
    'content-type': 'application/x-www-form-urlencoded',
    'sec-fetch-site': 'same-origin',
  })

  if (lines.length > 0) {
    headers.set('cookie', `unave-cart=${encodeURIComponent(JSON.stringify(lines))}`)
  }

  return POST(
    new Request('http://localhost:3000/api/cart/add', {
      body: new URLSearchParams(fields),
      headers,
      method: 'POST',
    }),
  )
}

afterEach(() => {
  payloadFind.mockReset()
})

describe('Buy now from the featured-product card', () => {
  it('adds a product and redirects to checkout', async () => {
    payloadFind.mockResolvedValue({ docs: [weeklyPlan] })

    const response = await post({
      buyNow: 'true',
      duration: 'One week',
      product: 'weekly-plan',
      return: '/checkout',
    })

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('/checkout')
    const cookie = response.headers
      .getSetCookie()
      .find((value) => value.startsWith('unave-cart='))
      ?.split(';')[0]
      ?.slice('unave-cart='.length)
    expect(JSON.parse(decodeURIComponent(cookie ?? ''))).toEqual([
      { duration: 'One week', product: 'weekly-plan', qty: 1 },
    ])
  })

  it('continues to checkout when the plan is already in the cart', async () => {
    payloadFind.mockResolvedValue({ docs: [weeklyPlan] })

    const response = await post(
      {
        buyNow: 'true',
        duration: 'One week',
        product: 'weekly-plan',
        return: '/checkout',
      },
      [{ duration: 'One week', product: 'weekly-plan', qty: 1 }],
    )

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('/checkout')
    expect(response.headers.getSetCookie()).toHaveLength(0)
  })

  it('continues to checkout when a one-time product is already at its quantity cap', async () => {
    payloadFind.mockResolvedValue({ docs: [oneTimeProduct] })

    const response = await post(
      {
        buyNow: 'true',
        duration: ONE_TIME_DURATION,
        product: 'rice-box',
        return: '/checkout',
      },
      [{ duration: ONE_TIME_DURATION, product: 'rice-box', qty: 10 }],
    )

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('/checkout')
    expect(response.headers.getSetCookie()).toHaveLength(0)
  })

  it('keeps duplicate Add to cart submissions on the cart notice', async () => {
    payloadFind.mockResolvedValue({ docs: [weeklyPlan] })

    const response = await post({ duration: 'One week', product: 'weekly-plan', return: '/' }, [
      { duration: 'One week', product: 'weekly-plan', qty: 1 },
    ])

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('/cart?notice=duplicate')
  })
})
