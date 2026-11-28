/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'

import { codOffered, readCashOrder } from '@/utilities/cashCheckout'

/** Whether checkout shows the cash choice, and reading the cash endpoint's answer. */
describe('codOffered', () => {
  it('is offered when on with no limit', () => {
    expect(codOffered({ enabled: true, maxTotal: null }, 9_999_999)).toBe(true)
  })

  it('is not offered when off', () => {
    expect(codOffered({ enabled: false, maxTotal: null }, 1000)).toBe(false)
  })

  it('is offered at exactly the limit', () => {
    expect(codOffered({ enabled: true, maxTotal: 150000 }, 150000)).toBe(true)
  })

  it('is not offered one paisa over the limit', () => {
    expect(codOffered({ enabled: true, maxTotal: 150000 }, 150001)).toBe(false)
  })
})

describe('readCashOrder', () => {
  it('accepts an order id', () => {
    expect(readCashOrder({ orderId: 12 })).toEqual({ orderId: 12 })
  })

  it('rejects an answer with no order id', () => {
    expect(readCashOrder({})).toBeNull()
    expect(readCashOrder(null)).toBeNull()
  })
})
