/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'

import { readCreatedOrder } from '@/utilities/orderCreate'

/**
 * What the checkout accepts back from `/api/orders/create` (spec 0007, AC-4).
 */
describe('readCreatedOrder', () => {
  it('accepts the shape the create endpoint answers with', () => {
    const result = readCreatedOrder({
      amount: 150000,
      gatewayOrderId: 'order_test_123',
      keyId: 'rzp_test_key',
    })

    expect(result).toEqual({
      amount: 150000,
      gatewayOrderId: 'order_test_123',
      keyId: 'rzp_test_key',
    })
  })

  it('rejects an answer with no gateway order id', () => {
    const result = readCreatedOrder({
      amount: 150000,
      keyId: 'rzp_test_key',
    })

    expect(result).toBeNull()
  })
})
