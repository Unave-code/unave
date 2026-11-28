/**
 * @vitest-environment node
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { cancelCashEndpoint, collectCashEndpoint } from '../../src/collections/Orders/cashActions'
import config from '@/payload.config'
import type { Order } from '@/payload-types'
import { createTestCustomer, createTestOrder, deleteQuietly, endpointRequest } from '../helpers/orderFixtures'

vi.setConfig({ hookTimeout: 120_000, testTimeout: 60_000 })

/**
 * Staff moving a cash order on (spec 2026-11-28 cash on delivery): Cash due
 * becomes Collected or Cancelled, once, and nothing else changes state.
 */

let payload: Payload
let customerId: number
let staff: { collection: 'users'; id: number; role: 'staff' }

const run = `it-cash-actions-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const orderIDs: (number | string)[] = []
let n = 0

beforeAll(async () => {
  payload = await getPayload({ config })
  customerId = (await createTestCustomer(payload, run)).id
  const user = await payload.create({
    collection: 'users',
    data: { email: `${run}@unave.test`, name: 'Kitchen staff', password: 'staff-pass-123', role: 'staff' } as never,
    overrideAccess: true,
  })
  staff = { collection: 'users', id: Number(user.id), role: 'staff' }
})

afterAll(async () => {
  await deleteQuietly(payload, 'orders', orderIDs)
  await deleteQuietly(payload, 'customers', [customerId])
  await payload.delete({ collection: 'users', id: staff.id, overrideAccess: true }).catch(() => undefined)
})

const cashOrder = async () => {
  const order = await createTestOrder(payload, customerId, {
    cashKey: `${run}-${(n += 1)}`,
    paymentState: 'cashDue',
    paymentType: 'cash',
  })
  orderIDs.push(order.id)
  return order
}

const act = async (
  endpoint: typeof collectCashEndpoint,
  id: number | string,
  user: unknown = staff,
) => {
  const req = endpointRequest(payload, {}, { user }) as unknown as Record<string, unknown>
  req.routeParams = { id: String(id) }
  return (await endpoint.handler(req as never)) as Response
}

const read = async (id: number | string) =>
  (await payload.findByID({ collection: 'orders', depth: 0, id, overrideAccess: true })) as Order

describe('collect and cancel a cash order', () => {
  it('collects a cash-due order', async () => {
    const order = await cashOrder()
    const response = await act(collectCashEndpoint, order.id)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ paymentState: 'collected' })
    const after = await read(order.id)
    expect(after.paymentState).toBe('collected')
    expect(after.paidAt).toBeTruthy()
    expect(after.collectedBy).toBe(staff.id)
  })

  it('cancels a cash-due order', async () => {
    const order = await cashOrder()
    const response = await act(cancelCashEndpoint, order.id)

    expect(response.status).toBe(200)
    const after = await read(order.id)
    expect(after.paymentState).toBe('cancelled')
    expect(after.cancelledAt).toBeTruthy()
    expect(after.paidAt ?? null).toBeNull()
  })

  it('refuses a second transition', async () => {
    const order = await cashOrder()
    await act(collectCashEndpoint, order.id)
    const paidAt = (await read(order.id)).paidAt

    expect((await act(collectCashEndpoint, order.id)).status).toBe(409)
    expect((await act(cancelCashEndpoint, order.id)).status).toBe(409)
    const after = await read(order.id)
    expect(after.paidAt).toBe(paidAt)
    expect(after.paymentState).toBe('collected')
  })

  it('refuses an online order', async () => {
    const order = await createTestOrder(payload, customerId, {
      gatewayOrderId: `${run}-online`,
      paidAt: new Date().toISOString(),
    })
    orderIDs.push(order.id)

    expect((await act(collectCashEndpoint, order.id)).status).toBe(409)
    expect((await read(order.id)).paymentState).toBe('paid')
  })

  it('answers 404 for an order that does not exist', async () => {
    expect((await act(collectCashEndpoint, 999_999_999)).status).toBe(404)
  })

  it('refuses a customer or a signed-out request', async () => {
    const order = await cashOrder()

    expect((await act(collectCashEndpoint, order.id, { collection: 'customers', id: customerId })).status).toBe(403)
    expect((await act(cancelCashEndpoint, order.id, null)).status).toBe(403)
    expect((await read(order.id)).paymentState).toBe('cashDue')
  })
})
