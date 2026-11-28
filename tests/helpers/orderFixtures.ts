import type { Payload } from 'payload'

import type { Order } from '@/payload-types'

/**
 * Customers and orders for the cash-on-delivery suites. Each suite passes its
 * own run prefix, collects the ids it made, and deletes them in afterAll.
 */

export const TEST_PASSWORD = 'correct-horse-battery'

export const createTestCustomer = async (
  payload: Payload,
  run: string,
): Promise<{ email: string; id: number; token: string }> => {
  const email = `${run}-${Math.random().toString(36).slice(2, 8)}@unave.test`

  const created = await payload.create({
    collection: 'customers',
    data: { email, name: 'Test Customer', password: TEST_PASSWORD },
    depth: 0,
    disableVerificationEmail: true,
    overrideAccess: true,
  })

  await payload.db.updateOne({
    collection: 'customers',
    data: { _verificationToken: null, _verified: true },
    id: created.id as number,
  })

  const login = await payload.login({
    collection: 'customers',
    data: { email, password: TEST_PASSWORD },
  })

  return { email, id: Number(created.id), token: login.token ?? '' }
}

export const testDelivery = {
  addressLine1: '12 Test Road',
  city: 'Pune',
  foodPreference: 'none' as const,
  name: 'Asha Kale',
  phone: '9876543210',
  pincode: '411001',
  state: 'Maharashtra',
}

/** An order row written straight to the collection, bypassing checkout. */
export const createTestOrder = async (
  payload: Payload,
  customerId: number,
  data: Partial<Order> = {},
): Promise<Order> =>
  (await payload.create({
    collection: 'orders',
    data: {
      customer: customerId,
      delivery: testDelivery,
      items: [
        {
          days: 5,
          durationLabel: 'One week',
          productTitle: 'Lunch plan',
          qty: 1,
          unitPrice: 150000,
        },
      ],
      subtotal: 150000,
      total: 150000,
      ...data,
    } as never,
    depth: 0,
    overrideAccess: true,
  })) as Order

export const deleteQuietly = async (
  payload: Payload,
  collection: 'customers' | 'orders',
  ids: (number | string)[],
): Promise<void> => {
  for (const id of ids) {
    await payload.delete({ collection, id, overrideAccess: true }).catch(() => undefined)
  }
}
