/**
 * @vitest-environment node
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { loadOrdersToday } from '../../src/components/Admin/Widgets/loadOrdersToday'
import config from '@/payload.config'
import { createTestCustomer, createTestOrder, deleteQuietly } from '../helpers/orderFixtures'

vi.setConfig({ hookTimeout: 120_000, testTimeout: 60_000 })

/**
 * The dashboard's "Orders today" figures (spec 2026-11-28 cash on delivery):
 * orders count the day they are placed, money counts the day it comes in, and
 * cash still owed shows on its own. A day in 2001 keeps other suites' orders out.
 */

let payload: Payload
let customerId: number

const run = `it-today-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const orderIDs: (number | string)[] = []
const DAY = new Date('2001-03-14T18:30:00.000Z') // midnight IST, 15 Mar 2001
const at = (hours: number) => new Date(DAY.getTime() + hours * 3_600_000).toISOString()

beforeAll(async () => {
  payload = await getPayload({ config })
  customerId = (await createTestCustomer(payload, run)).id

  const rows = [
    // Online, paid that day.
    { createdAt: at(2), gatewayOrderId: `${run}-a`, paidAt: at(2), total: 100000 },
    // Cash placed that day, not yet collected.
    { cashKey: `${run}-b`, createdAt: at(3), paymentState: 'cashDue', paymentType: 'cash', total: 50000 },
    // Cash placed that day and cancelled.
    { cancelledAt: at(5), cashKey: `${run}-c`, createdAt: at(4), paymentState: 'cancelled', paymentType: 'cash', total: 30000 },
    // Cash placed the day before, collected that day.
    { cashKey: `${run}-d`, createdAt: at(-5), paidAt: at(6), paymentState: 'collected', paymentType: 'cash', total: 70000 },
  ]

  for (const row of rows) {
    const order = await createTestOrder(payload, customerId, { ...row, subtotal: row.total } as never)
    orderIDs.push(order.id)
  }
})

afterAll(async () => {
  await deleteQuietly(payload, 'orders', orderIDs)
  await deleteQuietly(payload, 'customers', [customerId])
})

describe('loadOrdersToday', () => {
  it('counts a cash order placed today, and only money that came in', async () => {
    const today = await loadOrdersToday(payload, DAY)

    // Placed that day: the online order and the cash-due one; not the cancelled one.
    expect(today.placed).toBe(2)
    // Came in that day: the online payment and the collected cash.
    expect(today.collected).toBe(170000)
  })

  it('shows the cash still owed', async () => {
    const today = await loadOrdersToday(payload, DAY)

    // Other suites may leave cash-due orders of their own, so at least this one.
    expect(today.cashDue.count).toBeGreaterThanOrEqual(1)
    expect(today.cashDue.total).toBeGreaterThanOrEqual(50000)
  })
})
