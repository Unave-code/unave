import { describe, expect, it } from 'vitest'

import { validateCompareAtPrice } from '@/collections/Products/validateCompareAtPrice'

describe('one-time product old price validation', () => {
  it('allows an omitted value and a whole paise amount above the current price', () => {
    expect(validateCompareAtPrice(undefined, 10000)).toBe(true)
    expect(validateCompareAtPrice(14900, 10000)).toBe(true)
  })

  it('rejects an old price equal to or below the current price', () => {
    expect(validateCompareAtPrice(10000, 10000)).toBe(
      'The old price must be greater than the current price.',
    )
    expect(validateCompareAtPrice(9999, 10000)).toBe(
      'The old price must be greater than the current price.',
    )
  })

  it('rejects noninteger paise amounts', () => {
    expect(validateCompareAtPrice(10000.5, 10000)).toBe('Enter a whole amount for the old price.')
  })
})
