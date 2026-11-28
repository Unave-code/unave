/**
 * @vitest-environment node
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { prepareCheckout } from '../../src/collections/Orders/checkout'
import config from '@/payload.config'
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

/** The checks both order endpoints run before anything is written. */

let payload: Payload
let refs: { audienceId: number; subcategoryId: number }

const run = `it-checkout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const customerIDs: number[] = []

beforeAll(async () => {
  payload = await getPayload({ config })
  refs = {
    audienceId: await testAudienceId(payload),
    subcategoryId: await createTestSubcategory(payload, run),
  }
})

afterAll(async () => {
  await deleteQuietly(payload, 'customers', customerIDs)
  await sweepRun(payload, run)
})

const signedIn = async () => {
  const customer = await createTestCustomer(payload, run)
  customerIDs.push(customer.id)
  return customer
}

describe('prepareCheckout', () => {
  it('refuses a signed-out request with 401', async () => {
    const product = await createTestProduct(payload, run, refs)
    const result = await prepareCheckout(
      endpointRequest(payload, { delivery: checkoutDelivery }, { cart: [product] }),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it('refuses an unserved pincode with reason pincode-not-served', async () => {
    const customer = await signedIn()
    const product = await createTestProduct(payload, run, refs)
    const spy = stubGlobals(payload, { deliveryAreas: { enforce: true, pincodes: '411005' } })

    try {
      const result = await prepareCheckout(
        endpointRequest(payload, { delivery: checkoutDelivery }, { cart: [product], token: customer.token }),
      )

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.response.status).toBe(422)
        expect(((await result.response.json()) as { reason?: string }).reason).toBe('pincode-not-served')
      }
    } finally {
      spy.mockRestore()
    }
  })

  it('prices lines from the cookie', async () => {
    const customer = await signedIn()
    const product = await createTestProduct(payload, run, refs)
    const result = await prepareCheckout(
      endpointRequest(
        payload,
        // A price in the body is ignored: only the cookie and the live product count.
        { delivery: checkoutDelivery, note: 'Gate code 4', total: 1 },
        { cart: [product], token: customer.token },
      ),
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.checkout.total).toBe(150000)
      expect(result.checkout.customer.id).toBe(customer.id)
      expect(result.checkout.items).toHaveLength(1)
      expect(result.checkout.delivery.addressLine1).toBe('12 Test Road')
      expect(result.checkout.delivery.note).toBe('Gate code 4')
    }
  })
})
