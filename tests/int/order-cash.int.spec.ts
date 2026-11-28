/**
 * @vitest-environment node
 */
import { randomUUID } from 'node:crypto'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { cashOrderEndpoint } from '../../src/collections/Orders/cash'
import config from '@/payload.config'
import type { Order } from '@/payload-types'
import { testAudienceId } from '../helpers/audience'
import {
  checkoutDelivery,
  createTestCustomer,
  createTestProduct,
  createTestSubcategory,
  deleteQuietly,
  endpointRequest,
  stubGlobals,
} from '../helpers/orderFixtures'
import { sweepRun } from '../helpers/sweepRun'

vi.setConfig({ hookTimeout: 120_000, testTimeout: 60_000 })

/**
 * POST /api/orders/cash (spec 2026-11-28 cash on delivery): a cash order is
 * written at once, after the same checks as an online one, and waits as Cash due.
 */

const mocks = vi.hoisted(() => ({
  isRazorpayConfigured: vi.fn(),
  sendOrderMails: vi.fn(),
}))

vi.mock('../../src/utilities/razorpay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/utilities/razorpay')>()),
  isRazorpayConfigured: mocks.isRazorpayConfigured,
}))

vi.mock('../../src/collections/Orders/mail', () => ({
  sendOrderMails: mocks.sendOrderMails,
}))

let payload: Payload
let refs: { audienceId: number; subcategoryId: number }

const run = `it-cash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const customerIDs: number[] = []
const orderIDs: (number | string)[] = []

beforeAll(async () => {
  payload = await getPayload({ config })
  refs = {
    audienceId: await testAudienceId(payload),
    subcategoryId: await createTestSubcategory(payload, run),
  }
})

beforeEach(() => {
  mocks.isRazorpayConfigured.mockReset().mockReturnValue(true)
  mocks.sendOrderMails.mockReset().mockResolvedValue(undefined)
})

afterAll(async () => {
  await deleteQuietly(payload, 'orders', orderIDs)
  await deleteQuietly(payload, 'customers', customerIDs)
  await sweepRun(payload, run)
})

const placeCash = async (
  options: { cashKey?: unknown; settings?: { codEnabled: boolean; codMaxTotal?: null | number } } = {},
) => {
  const customer = await createTestCustomer(payload, run)
  customerIDs.push(customer.id)
  const product = await createTestProduct(payload, run, refs)
  const cashKey = 'cashKey' in options ? options.cashKey : randomUUID()

  const send = async () => {
    const spy = stubGlobals(payload, {
      paymentSettings: options.settings ?? { codEnabled: true },
    })
    try {
      return (await cashOrderEndpoint.handler(
        endpointRequest(
          payload,
          { cashKey, delivery: checkoutDelivery },
          { cart: [product], token: customer.token },
        ),
      )) as Response
    } finally {
      spy.mockRestore()
    }
  }

  return { cashKey, customer, send }
}

const ordersWithKey = async (cashKey: string) =>
  (
    await payload.find({
      collection: 'orders',
      depth: 0,
      overrideAccess: true,
      where: { cashKey: { equals: cashKey } },
    })
  ).docs as Order[]

/** sendOrderMails runs after the reply; give it a tick to start. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50))

describe('POST /api/orders/cash', () => {
  it('writes a cash-due order with no gateway fields', async () => {
    const { cashKey, customer, send } = await placeCash()
    const response = await send()

    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('unave-cart=')
    const { orderId } = (await response.json()) as { orderId: number }
    orderIDs.push(orderId)

    const order = (await payload.findByID({ collection: 'orders', depth: 0, id: orderId, overrideAccess: true })) as Order
    expect(order.paymentType).toBe('cash')
    expect(order.paymentState).toBe('cashDue')
    expect(order.paidAt ?? null).toBeNull()
    expect(order.gatewayOrderId ?? null).toBeNull()
    expect(order.total).toBe(150000)
    expect(order.subtotal).toBe(150000)
    expect(order.cashKey).toBe(cashKey)
    expect(order.customer).toBe(customer.id)
    expect(order.items).toHaveLength(1)

    await settle()
    expect(mocks.sendOrderMails).toHaveBeenCalledTimes(1)
  })

  it('returns the same order for a repeated cashKey', async () => {
    const { cashKey, send } = await placeCash()
    const first = (await (await send()).json()) as { orderId: number }
    const second = (await (await send()).json()) as { orderId: number }
    orderIDs.push(first.orderId)

    expect(second.orderId).toBe(first.orderId)
    expect(await ordersWithKey(cashKey as string)).toHaveLength(1)
    await settle()
    expect(mocks.sendOrderMails).toHaveBeenCalledTimes(1)
  })

  it('refuses when COD is off', async () => {
    const { cashKey, send } = await placeCash({ settings: { codEnabled: false } })
    const response = await send()

    expect(response.status).toBe(422)
    const body = (await response.json()) as { message: string; reason: string }
    expect(body.reason).toBe('cod-off')
    expect(body.message).toBe(
      'Cash on delivery isn’t available right now. Please pay online to place your order.',
    )
    expect(await ordersWithKey(cashKey as string)).toHaveLength(0)
  })

  it('refuses a total over the limit', async () => {
    const { cashKey, send } = await placeCash({ settings: { codEnabled: true, codMaxTotal: 100000 } })
    const response = await send()

    expect(response.status).toBe(422)
    const body = (await response.json()) as { message: string; reason: string }
    expect(body.reason).toBe('cod-limit')
    expect(body.message).toBe(
      'Cash on delivery is available for orders up to ₹1,000. Please pay online for this order.',
    )
    expect(await ordersWithKey(cashKey as string)).toHaveLength(0)
  })

  it('accepts a total exactly at the limit', async () => {
    const { send } = await placeCash({ settings: { codEnabled: true, codMaxTotal: 150000 } })
    const response = await send()

    expect(response.status).toBe(200)
    orderIDs.push(((await response.json()) as { orderId: number }).orderId)
  })

  it('works when Razorpay is not configured', async () => {
    mocks.isRazorpayConfigured.mockReturnValue(false)
    const { send } = await placeCash()
    const response = await send()

    expect(response.status).toBe(200)
    orderIDs.push(((await response.json()) as { orderId: number }).orderId)
  })

  it('refuses a body without a valid cashKey', async () => {
    const { send } = await placeCash({ cashKey: 'not-a-uuid' })

    expect((await send()).status).toBe(422)
  })
})
