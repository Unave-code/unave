import { ACCOUNT_PATH } from '@/auth/paths'
import { readCartFromHeaders } from '@/utilities/cart'

export const CHECKOUT_PATH = '/checkout'

/**
 * Where a customer lands once signed in: the page they were sent from, else
 * checkout when their cart holds something (a new account usually signs in to
 * finish an order), else their account.
 */
export const landingAfterSignIn = (returnTo: null | string | undefined, cookieHeader: null | string | undefined): string =>
  returnTo || (readCartFromHeaders(cookieHeader).length > 0 ? CHECKOUT_PATH : ACCOUNT_PATH)
