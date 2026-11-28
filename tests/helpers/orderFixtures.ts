import type { Payload } from 'payload'
import { vi } from 'vitest'

import type { Order, Product } from '@/payload-types'

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

/** A ready-to-eat subcategory for this run; every product needs one. */
export const createTestSubcategory = async (payload: Payload, run: string): Promise<number> =>
  Number(
    (
      await payload.create({
        collection: 'subcategories',
        context: { disableRevalidate: true },
        data: { category: 'ready-to-eat', slug: '', title: `${run} tiffin` },
        overrideAccess: true,
      })
    ).id,
  )

/** A live plan priced ₹1,500 for one week and ₹6,600 for one month. */
export const createTestProduct = async (
  payload: Payload,
  run: string,
  refs: { audienceId: number; subcategoryId: number },
): Promise<Product> =>
  (await payload.create({
    collection: 'products',
    context: { disableRevalidate: true },
    data: {
      audience: refs.audienceId,
      available: true,
      category: 'ready-to-eat',
      durations: [
        { days: 5, label: 'One week', price: 150000 },
        { days: 22, label: 'One month', price: 660000 },
      ],
      mealPlan: true,
      slug: `${run}-${Math.random().toString(36).slice(2, 10)}`,
      subcategory: refs.subcategoryId,
      title: 'Lunch plan',
      type: 'plan' as const,
    },
    depth: 0,
    overrideAccess: true,
  })) as Product

/** The delivery block the checkout form posts (the form's own field names). */
export const checkoutDelivery = {
  city: 'Pune',
  foodPreference: 'none',
  line1: '12 Test Road',
  line2: '',
  name: 'Asha Kale',
  phone: '9876543210',
  pincode: '411001',
  state: 'Maharashtra',
}

let ipCounter = 0

/**
 * A same-origin endpoint request carrying the customer's session and the cart
 * cookie. Each request gets its own address so the per-IP limit never trips.
 */
export const endpointRequest = (
  payload: Payload,
  body: unknown,
  options: { cart?: Product[]; crossSite?: boolean; token?: string; user?: unknown } = {},
) => {
  const headers = new Headers()
  headers.set('x-forwarded-for', `198.51.100.${(ipCounter = (ipCounter % 250) + 1)}`)

  const cookies: string[] = []
  if (options.token) cookies.push(`unave-customer=${options.token}`)
  if (options.cart) {
    const lines = options.cart.map((product) => ({
      duration: product.durations?.[0]?.label ?? '',
      product: product.slug,
    }))
    cookies.push(`unave-cart=${encodeURIComponent(JSON.stringify(lines))}`)
  }
  if (cookies.length > 0) headers.set('cookie', cookies.join('; '))

  if (options.crossSite) headers.set('origin', 'https://evil.example')
  else headers.set('sec-fetch-site', 'same-origin')

  return {
    headers,
    json: async () => body,
    logger: payload.logger,
    payload,
    user: options.user ?? null,
  } as never
}

/**
 * Stubs the globals a checkout reads, so parallel suites on the same database
 * never see settings they did not ask for. Unlisted globals read for real.
 */
export const stubGlobals = (
  payload: Payload,
  globals: {
    deliveryAreas?: { enforce: boolean; pincodes: string }
    paymentSettings?: { codEnabled: boolean; codMaxTotal?: null | number }
  },
) => {
  const real = payload.findGlobal.bind(payload)

  return vi.spyOn(payload, 'findGlobal').mockImplementation((async (args: { slug: string }) => {
    if (args.slug === 'delivery-areas' && globals.deliveryAreas) {
      return {
        areas: [{ id: 'a', name: 'Shivajinagar', pincodes: globals.deliveryAreas.pincodes }],
        enforce: globals.deliveryAreas.enforce,
        globalType: 'delivery-areas',
        id: 1,
      }
    }
    if (args.slug === 'payment-settings' && globals.paymentSettings) {
      return { codMaxTotal: null, globalType: 'payment-settings', id: 1, ...globals.paymentSettings }
    }
    return real(args as never)
  }) as never)
}

export const deleteQuietly = async (
  payload: Payload,
  collection: 'customers' | 'orders' | 'products' | 'subcategories',
  ids: (number | string)[],
): Promise<void> => {
  for (const id of ids) {
    await payload.delete({ collection, id, overrideAccess: true }).catch(() => undefined)
  }
}
