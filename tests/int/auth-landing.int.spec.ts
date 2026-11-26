import { describe, expect, it } from 'vitest'

import { landingAfterSignIn } from '@/auth/landing'

const cart = `unave-cart=${encodeURIComponent(JSON.stringify([{ duration: 'One week', product: 'lunch-plan' }]))}`

describe('where a customer lands after signing in', () => {
  it('goes to checkout when the cart holds something', () => {
    expect(landingAfterSignIn(null, `unave-customer=abc; ${cart}`)).toBe('/checkout')
  })

  it('goes to the account with an empty or missing cart', () => {
    expect(landingAfterSignIn(null, 'unave-cart=%5B%5D')).toBe('/account')
    expect(landingAfterSignIn(null, null)).toBe('/account')
  })

  it('keeps the page the customer was sent from', () => {
    expect(landingAfterSignIn('/products', cart)).toBe('/products')
  })
})
