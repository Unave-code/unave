import { describe, expect, it } from 'vitest'

import { formatPaise, formatRupeeInput, rupeesToPaise } from '@/utilities/money'

/**
 * The one place paise become rupees and back (spec 0007).
 *
 * The database, the order rows and Razorpay all keep paise. Only the admin
 * field and the on site prices show rupees. These hold the translation to a
 * whole rupee for a plain number, two decimals when there are paise, and an
 * empty field for an empty answer.
 */

describe('formatRupeeInput', () => {
  it('prints whole rupees without decimals', () => {
    expect(formatRupeeInput(150000)).toBe('1500')
  })

  it('keeps two decimals when there are paise', () => {
    expect(formatRupeeInput(150050)).toBe('1500.50')
  })

  it('prints nothing for a value that is not a number', () => {
    expect(formatRupeeInput(null)).toBe('')
    expect(formatRupeeInput(undefined)).toBe('')
  })
})

describe('rupeesToPaise', () => {
  it('turns typed rupees into whole paise', () => {
    expect(rupeesToPaise('1500')).toBe(150000)
  })

  it('refuses a comma grouped figure rather than guessing at it', () => {
    expect(rupeesToPaise('1,500.50')).toBeNull()
  })

  it('rejects more than two decimal places instead of rounding them', () => {
    // Spec 0010, AC-1: excess precision is refused, never silently rounded.
    expect(rupeesToPaise('499.999')).toBeNull()
    expect(rupeesToPaise('0.001')).toBeNull()
  })

  it('accepts a whole number of rupees and one or two decimals', () => {
    expect(rupeesToPaise('499')).toBe(49900)
    expect(rupeesToPaise('499.5')).toBe(49950)
    expect(rupeesToPaise('499.05')).toBe(49905)
  })

  it('rejects anything that is not a plain rupee figure', () => {
    expect(rupeesToPaise('₹499')).toBeNull()
    expect(rupeesToPaise('4,99')).toBeNull()
    expect(rupeesToPaise('-5')).toBeNull()
    expect(rupeesToPaise('abc')).toBeNull()
  })

  it('answers nothing for an empty field', () => {
    expect(rupeesToPaise('')).toBeNull()
    expect(rupeesToPaise('   ')).toBeNull()
  })

  it('survives a round trip through the admin field', () => {
    expect(rupeesToPaise(formatRupeeInput(660000))).toBe(660000)
  })
})

describe('formatPaise', () => {
  it('shows rupees on the site', () => {
    expect(formatPaise(150000)).toContain('1,500')
  })
})
