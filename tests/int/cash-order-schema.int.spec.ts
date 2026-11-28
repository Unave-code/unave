/**
 * @vitest-environment node
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import { createTestCustomer, createTestOrder, deleteQuietly } from '../helpers/orderFixtures'

vi.setConfig({ hookTimeout: 120_000, testTimeout: 60_000 })

/** The order fields and settings that cash on delivery rests on. */

let payload: Payload
let customerId: number

const run = `it-cash-schema-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const orderIDs: (number | string)[] = []

beforeAll(async () => {
  payload = await getPayload({ config })
  customerId = (await createTestCustomer(payload, run)).id
})

afterAll(async () => {
  await deleteQuietly(payload, 'orders', orderIDs)
  await deleteQuietly(payload, 'customers', [customerId])
})

describe('cash on delivery order fields', () => {
  it('defaults a new order to online and paid', async () => {
    const order = await createTestOrder(payload, customerId, { gatewayOrderId: `${run}-a` })
    orderIDs.push(order.id)

    expect(order.paymentType).toBe('online')
    expect(order.paymentState).toBe('paid')
  })

  it('allows two orders with no gateway order id', async () => {
    const first = await createTestOrder(payload, customerId, {
      cashKey: `${run}-k1`,
      paymentState: 'cashDue',
      paymentType: 'cash',
    })
    const second = await createTestOrder(payload, customerId, {
      cashKey: `${run}-k2`,
      paymentState: 'cashDue',
      paymentType: 'cash',
    })
    orderIDs.push(first.id, second.id)

    expect(first.gatewayOrderId ?? null).toBeNull()
    expect(second.gatewayOrderId ?? null).toBeNull()
    expect(second.paymentState).toBe('cashDue')
  })

  it('refuses a duplicate cashKey', async () => {
    const first = await createTestOrder(payload, customerId, {
      cashKey: `${run}-dup`,
      paymentState: 'cashDue',
      paymentType: 'cash',
    })
    orderIDs.push(first.id)

    await expect(
      createTestOrder(payload, customerId, {
        cashKey: `${run}-dup`,
        paymentState: 'cashDue',
        paymentType: 'cash',
      }),
    ).rejects.toThrow()
  })

  it('reads payment settings defaults', async () => {
    const settings = await payload.findGlobal({ depth: 0, overrideAccess: true, slug: 'payment-settings' })

    expect(settings.codEnabled).toBe(true)
    expect(settings.codMaxTotal ?? null).toBeNull()
  })
})
