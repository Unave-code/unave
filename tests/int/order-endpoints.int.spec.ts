/**
 * @vitest-environment node
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createOrderEndpoint, verifyOrderEndpoint } from '../../src/collections/Orders/endpoints'
import { buildOrderNotes, type OrderIntentItem } from '../../src/collections/Orders/intent'
import config from '@/payload.config'
import type { Customer, Order, Product } from '@/payload-types'

// The dev database is remote, so a single test can make several slow round trips,
// and the first `getPayload` in a worker pulls the schema from it.
vi.setConfig({ hookTimeout: 120_000, testTimeout: 60_000 })

/**
 * The two endpoints the checkout popup talks to.
 *
 * The gateway is mocked at the module boundary: the browser half of Razorpay
 * cannot run here, and the point of these tests is what the *site* does with
 * the basket and the claims a browser makes. No order row is written at
 * checkout any more, so these tests hold two rules above all: creating opens a
 * gateway order and writes nothing, and verifying writes one paid row from what
 * the gateway order carries.
 */

const mocks = vi.hoisted(() => ({
  createRazorpayOrder: vi.fn(),
  fetchRazorpayOrder: vi.fn(),
  fetchRazorpayPayment: vi.fn(),
  isRazorpayConfigured: vi.fn(),
  sendOrderMails: vi.fn(),
  verifyPaymentSignature: vi.fn(),
}))

vi.mock('../../src/utilities/razorpay', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/utilities/razorpay')>()

  return {
    ...actual,
    createRazorpayOrder: mocks.createRazorpayOrder,
    fetchRazorpayOrder: mocks.fetchRazorpayOrder,
    fetchRazorpayPayment: mocks.fetchRazorpayPayment,
    isRazorpayConfigured: mocks.isRazorpayConfigured,
    razorpayMode: () => 'test',
    verifyPaymentSignature: mocks.verifyPaymentSignature,
  }
})

vi.mock('../../src/collections/Orders/mail', () => ({
  sendOrderMails: mocks.sendOrderMails,
}))

let payload: Payload

const run = `it-order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const productIDs: (number | string)[] = []
const subcategoryIDs: (number | string)[] = []
const customerIDs: (number | string)[] = []
const orderIDs: (number | string)[] = []

let readyToEatSubcategoryId: number | string

const PASSWORD = 'correct-horse-battery'

let ipCounter = 0

const CART_COOKIE = 'unave-cart'
const CUSTOMER_COOKIE = 'unave-customer'

type CartEntry = { duration: string; product: string }

const cartValue = (lines: CartEntry[]): string => encodeURIComponent(JSON.stringify(lines))

const headers = (options: { cart?: CartEntry[]; cookies?: string; crossSite?: boolean } = {}) => {
  const built = new Headers()
  built.set('x-forwarded-for', `203.0.113.${(ipCounter += 1)}`)

  if (options.cookies) built.set('cookie', options.cookies)
  if (options.cart) {
    const existing = built.get('cookie')
    built.set(
      'cookie',
      `${existing ? `${existing}; ` : ''}${CART_COOKIE}=${cartValue(options.cart)}`,
    )
  }

  if (options.crossSite) {
    built.set('origin', 'https://evil.example')
  } else {
    built.set('sec-fetch-site', 'same-origin')
  }

  return built
}

const createRequest = (
  body: unknown,
  options: { cart?: CartEntry[]; cookies?: string; crossSite?: boolean } = {},
) =>
  ({
    headers: headers(options),
    json: async () => body,
    logger: payload.logger,
    payload,
  }) as never

const cartFor = (product: Product, index = 0): CartEntry => ({
  duration: product.durations?.[index]?.label ?? '',
  product: product.slug,
})

const createCustomer = async (): Promise<{ email: string; id: number | string; token: string }> => {
  const email = `${run}-${Math.random().toString(36).slice(2, 8)}@unave.test`

  const created = await payload.create({
    collection: 'customers',
    data: { email, name: 'Test Customer', password: PASSWORD },
    depth: 0,
    disableVerificationEmail: true,
    overrideAccess: true,
  })

  await payload.db.updateOne({
    collection: 'customers',
    data: { _verificationToken: null, _verified: true },
    id: created.id as number,
  })

  customerIDs.push(created.id)

  const login = await payload.login({
    collection: 'customers',
    data: { email, password: PASSWORD },
  })

  return { email, id: created.id, token: login.token ?? '' }
}

const createProduct = async (overrides: Partial<{ available: boolean; title: string }> = {}) => {
  const created = (await payload.create({
    collection: 'products',
    data: {
      available: true,
      description: undefined,
      durations: [
        { days: 5, label: 'One week', price: 150000 },
        { days: 22, label: 'One month', price: 660000 },
      ],
      slug: `${run}-${productIDs.length}-${Math.random().toString(36).slice(2, 8)}`,
      title: 'Lunch plan',
      category: 'ready-to-eat',
      subcategory: readyToEatSubcategoryId as number,
      audience: 'adults',
      ...overrides,
    },
    depth: 0,
    // The revalidateProducts hook calls Next's revalidateTag, which only exists
    // inside the Next runtime these specs do not run in.
    context: { disableRevalidate: true },
    overrideAccess: true,
  })) as Product

  productIDs.push(created.id)
  return created
}

const delivery = {
  city: 'Pune',
  line1: '12 Test Road',
  line2: '',
  name: 'Asha Kale',
  phone: '9876543210',
  pincode: '411001',
  state: 'Maharashtra',
}

const findOrder = async (id: number | string): Promise<Order | null> => {
  try {
    return (await payload.findByID({
      collection: 'orders',
      depth: 0,
      id,
      overrideAccess: true,
    })) as Order
  } catch {
    return null
  }
}

const findOrderByGateway = async (gatewayOrderId: string): Promise<Order | null> => {
  const found = await payload.find({
    collection: 'orders',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { gatewayOrderId: { equals: gatewayOrderId } },
  })

  return (found.docs[0] as Order | undefined) ?? null
}

const itemFor = (product: Product, index = 0): OrderIntentItem => {
  const duration = product.durations?.[index]

  return {
    days: Number(duration?.days),
    durationLabel: duration?.label ?? '',
    productId: product.id,
    productTitle: product.title,
    unitPrice: Number(duration?.price),
  }
}

/**
 * Put a checkout intent on the gateway order the verify tests read back, and
 * make the payment look captured, so the endpoint only has to decide whether to
 * write the row.
 */
const stageGatewayOrder = (
  items: OrderIntentItem[],
  customer: { id: number | string },
  gatewayOrderId: string,
) => {
  const total = items.reduce((sum, item) => sum + item.unitPrice, 0)

  const notes = buildOrderNotes({
    customerId: customer.id,
    delivery,
    items,
    note: 'Ring the bell twice',
  })

  mocks.fetchRazorpayOrder.mockResolvedValue({
    amount: total,
    currency: 'INR',
    id: gatewayOrderId,
    notes,
  })

  mocks.fetchRazorpayPayment.mockResolvedValue({
    amount: total,
    currency: 'INR',
    id: `pay_${gatewayOrderId}`,
    order_id: gatewayOrderId,
    status: 'captured',
  })

  mocks.verifyPaymentSignature.mockReturnValue(true)

  return { notes, total }
}

beforeAll(async () => {
  payload = await getPayload({ config })

  // Every product carries a subcategory from its own category (spec 0008, AC-9).
  const subcategory = await payload.create({
    collection: 'subcategories',
    data: { category: 'ready-to-eat', title: `${run} tiffin` },
    overrideAccess: true,
  })

  readyToEatSubcategoryId = subcategory.id
  subcategoryIDs.push(subcategory.id)
})

beforeEach(() => {
  mocks.createRazorpayOrder.mockReset()
  mocks.fetchRazorpayOrder.mockReset()
  mocks.fetchRazorpayPayment.mockReset()
  mocks.isRazorpayConfigured.mockReset()
  mocks.sendOrderMails.mockReset()
  mocks.verifyPaymentSignature.mockReset()

  mocks.isRazorpayConfigured.mockReturnValue(true)
  mocks.sendOrderMails.mockResolvedValue({ sent: true })
})

afterAll(async () => {
  for (const id of orderIDs) {
    try {
      await payload.delete({ collection: 'orders', id, overrideAccess: true })
    } catch {
      // Best effort cleanup.
    }
  }

  for (const id of productIDs) {
    try {
      await payload.delete({ collection: 'products', id, overrideAccess: true, context: { disableRevalidate: true } })
    } catch {
      // Best effort cleanup.
    }
  }

  for (const id of subcategoryIDs) {
    try {
      await payload.delete({ collection: 'subcategories', id, overrideAccess: true })
    } catch {
      // Best effort cleanup.
    }
  }

  for (const id of customerIDs) {
    try {
      await payload.delete({ collection: 'customers', id, overrideAccess: true })
    } catch {
      // Best effort cleanup.
    }
  }
})

describe('POST /api/orders/create', () => {
  it('opens one gateway order for the whole basket and writes no row', async () => {
    const customer = await createCustomer()
    const lunch = await createProduct()
    const dinner = await createProduct({ title: 'Dinner plan' })

    mocks.createRazorpayOrder.mockResolvedValue({
      amount: 300000,
      currency: 'INR',
      id: `order_${run}_1`,
    })

    const response = (await createOrderEndpoint.handler(
      createRequest(
        { delivery, note: 'Ring the bell twice' },
        {
          cart: [cartFor(lunch, 0), cartFor(dinner, 0)],
          cookies: `${CUSTOMER_COOKIE}=${customer.token}`,
        },
      ),
    )) as Response

    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      amount: number
      gatewayOrderId: string
      orderId?: unknown
    }

    expect(body.amount).toBe(300000)
    expect(body.gatewayOrderId).toBe(`order_${run}_1`)
    // No local row is written, so no order id comes back.
    expect(body.orderId).toBeUndefined()

    const notes = mocks.createRazorpayOrder.mock.calls[0]?.[2] as Record<string, string>
    expect(notes.d_name).toBe('Asha Kale')
    expect(notes.d_city).toBe('Pune')
    expect(notes.d_note).toBe('Ring the bell twice')

    const pack = JSON.parse(notes.l0) as unknown[]
    expect(pack).toHaveLength(2)

    // Nothing reached the orders table.
    expect(await findOrderByGateway(`order_${run}_1`)).toBeNull()
  })

  it('packs two lines into one note', async () => {
    const customer = await createCustomer()
    const product = await createProduct()

    mocks.createRazorpayOrder.mockResolvedValue({
      amount: 960000,
      currency: 'INR',
      id: `order_${run}_packed`,
    })

    const response = (await createOrderEndpoint.handler(
      createRequest(
        { delivery },
        {
          cart: [cartFor(product, 0), cartFor(product, 1)],
          cookies: `${CUSTOMER_COOKIE}=${customer.token}`,
        },
      ),
    )) as Response

    expect(response.status).toBe(200)

    const notes = mocks.createRazorpayOrder.mock.calls[0]?.[2] as Record<string, string>
    expect(JSON.parse(notes.l0)).toHaveLength(2)
    expect(notes.l1).toBeUndefined()
  })

  it('trusts the product records, not the browser, for every rupee', async () => {
    const customer = await createCustomer()
    const product = await createProduct()

    mocks.createRazorpayOrder.mockResolvedValue({
      amount: 150000,
      currency: 'INR',
      id: `order_${run}_claims`,
    })

    // A hand built body can carry any numbers it likes; the endpoint never
    // reads a line or an amount from it, only the delivery.
    const response = (await createOrderEndpoint.handler(
      createRequest(
        {
          days: 1,
          delivery,
          duration: 'One week',
          product: product.slug,
          price: 1,
          total: 1,
        },
        {
          cart: [cartFor(product, 0)],
          cookies: `${CUSTOMER_COOKIE}=${customer.token}`,
        },
      ),
    )) as Response

    expect(response.status).toBe(200)

    const body = (await response.json()) as { amount: number }
    expect(body.amount).toBe(150000)

    const notes = mocks.createRazorpayOrder.mock.calls[0]?.[2] as Record<string, string>
    expect(JSON.parse(notes.l0)[0].slice(0, 4)).toEqual([product.id, 'One week', 5, 150000])
  })

  it('opens a fresh gateway order on every attempt instead of reusing one', async () => {
    const customer = await createCustomer()
    const product = await createProduct()

    mocks.createRazorpayOrder
      .mockResolvedValueOnce({ amount: 150000, currency: 'INR', id: `order_${run}_retry_a` })
      .mockResolvedValueOnce({ amount: 150000, currency: 'INR', id: `order_${run}_retry_b` })

    const options = {
      cart: [cartFor(product, 0)],
      cookies: `${CUSTOMER_COOKIE}=${customer.token}`,
    }

    await createOrderEndpoint.handler(createRequest({ delivery }, options))
    await createOrderEndpoint.handler(createRequest({ delivery }, options))

    expect(mocks.createRazorpayOrder).toHaveBeenCalledTimes(2)
    expect(await findOrderByGateway(`order_${run}_retry_a`)).toBeNull()
    expect(await findOrderByGateway(`order_${run}_retry_b`)).toBeNull()
  })

  it('refuses a signed out visitor with 401 and writes nothing', async () => {
    const response = (await createOrderEndpoint.handler(createRequest({ delivery }))) as Response

    expect(response.status).toBe(401)
    expect((await response.json()) as { message: string }).toHaveProperty('message')
  })

  it('refuses a cross site post before anything else', async () => {
    const customer = await createCustomer()

    const response = (await createOrderEndpoint.handler(
      createRequest(
        { delivery },
        {
          cart: [{ duration: 'One week', product: 'lunch-plan' }],
          cookies: `${CUSTOMER_COOKIE}=${customer.token}`,
          crossSite: true,
        },
      ),
    )) as Response

    expect(response.status).toBe(403)
  })

  it('refuses an empty cart with a plain sentence', async () => {
    const customer = await createCustomer()

    const response = (await createOrderEndpoint.handler(
      createRequest({ delivery }, { cookies: `${CUSTOMER_COOKIE}=${customer.token}` }),
    )) as Response

    expect(response.status).toBe(422)

    const body = (await response.json()) as { message: string }
    expect(body.message).toBe('Your cart is empty. Add a product before checking out.')
  })

  it('refuses more than ten lines', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const lines = Array.from({ length: 11 }, (_, index) => ({
      duration: `Duration ${index}`,
      product: product.slug,
    }))

    const response = (await createOrderEndpoint.handler(
      createRequest(
        { delivery },
        { cart: lines, cookies: `${CUSTOMER_COOKIE}=${customer.token}` },
      ),
    )) as Response

    expect(response.status).toBe(422)

    const body = (await response.json()) as { message: string }
    expect(body.message).toContain('at most ten products')
  })

  it('refuses the same line twice', async () => {
    const customer = await createCustomer()
    const product = await createProduct()

    const response = (await createOrderEndpoint.handler(
      createRequest(
        { delivery },
        {
          cart: [cartFor(product, 0), cartFor(product, 0)],
          cookies: `${CUSTOMER_COOKIE}=${customer.token}`,
        },
      ),
    )) as Response

    expect(response.status).toBe(422)

    const body = (await response.json()) as { message: string }
    expect(body.message).toContain('twice')
  })

  it('refuses a product that is not on the menu', async () => {
    const customer = await createCustomer()

    const response = (await createOrderEndpoint.handler(
      createRequest(
        { delivery },
        {
          cart: [{ duration: 'One week', product: `${run}-missing` }],
          cookies: `${CUSTOMER_COOKIE}=${customer.token}`,
        },
      ),
    )) as Response

    expect(response.status).toBe(422)

    const body = (await response.json()) as { message: string }
    expect(body.message).toContain('changed or left the menu')
  })

  it('refuses a paused product', async () => {
    const customer = await createCustomer()
    const product = await createProduct({ available: false })

    const response = (await createOrderEndpoint.handler(
      createRequest(
        { delivery },
        {
          cart: [cartFor(product, 0)],
          cookies: `${CUSTOMER_COOKIE}=${customer.token}`,
        },
      ),
    )) as Response

    expect(response.status).toBe(422)

    const body = (await response.json()) as { message: string }
    expect(body.message).toContain('changed or left the menu')
  })

  it('refuses a duration that is no longer on the live product', async () => {
    const customer = await createCustomer()
    const product = await createProduct()

    const response = (await createOrderEndpoint.handler(
      createRequest(
        { delivery },
        {
          cart: [{ duration: 'Two weeks', product: product.slug }],
          cookies: `${CUSTOMER_COOKIE}=${customer.token}`,
        },
      ),
    )) as Response

    expect(response.status).toBe(422)

    const body = (await response.json()) as { message: string }
    expect(body.message).toContain('changed or left the menu')
  })

  it('answers 503 with a plain sentence when the gateway is not configured', async () => {
    mocks.isRazorpayConfigured.mockReturnValue(false)

    try {
      const customer = await createCustomer()
      const product = await createProduct()

      const response = (await createOrderEndpoint.handler(
        createRequest(
          { delivery },
          {
            cart: [cartFor(product, 0)],
            cookies: `${CUSTOMER_COOKIE}=${customer.token}`,
          },
        ),
      )) as Response

      expect(response.status).toBe(503)

      const body = (await response.json()) as { message: string }
      expect(body.message).toContain('not set up')
    } finally {
      mocks.isRazorpayConfigured.mockReturnValue(true)
    }
  })
})

describe('POST /api/orders/verify', () => {
  it('writes one paid order with every line and clears the cart', async () => {
    const customer = await createCustomer()
    const lunch = await createProduct()
    const dinner = await createProduct({ title: 'Dinner plan' })
    const gatewayOrderId = `order_${run}_v1`

    stageGatewayOrder([itemFor(lunch, 0), itemFor(dinner, 0)], customer, gatewayOrderId)

    const response = (await verifyOrderEndpoint.handler(
      createRequest(
        {
          razorpay_order_id: gatewayOrderId,
          razorpay_payment_id: `pay_${gatewayOrderId}`,
          razorpay_signature: 'sig',
        },
        { cookies: `${CUSTOMER_COOKIE}=${customer.token}` },
      ),
    )) as Response

    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain(`${CART_COOKIE}=`)
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')

    const body = (await response.json()) as { orderId: number; status: string }
    expect(body.status).toBe('paid')
    expect(body.orderId).toBeDefined()

    orderIDs.push(body.orderId)

    const row = await findOrder(body.orderId)
    expect(row).not.toBeNull()
    expect(row!.total).toBe(300000)
    expect(String(row!.customer)).toBe(String(customer.id))
    expect(row!.items).toHaveLength(2)
    expect(row!.items?.[0]?.productTitle).toBe('Lunch plan')
    expect(row!.items?.[1]?.productTitle).toBe('Dinner plan')
    expect(row!.items?.[0]?.unitPrice).toBe(150000)
    expect(row!.delivery?.name).toBe('Asha Kale')
    expect(row!.delivery?.note).toBe('Ring the bell twice')
    expect(row!.gatewayPaymentId).toBe(`pay_${gatewayOrderId}`)
    expect(row!.paidAt).toBeTruthy()
    expect(mocks.sendOrderMails).toHaveBeenCalledOnce()
  })

  it('refuses a return whose signature does not verify and writes nothing', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const gatewayOrderId = `order_${run}_v2`

    stageGatewayOrder([itemFor(product, 0)], customer, gatewayOrderId)
    mocks.verifyPaymentSignature.mockReturnValue(false)

    const response = (await verifyOrderEndpoint.handler(
      createRequest(
        {
          razorpay_order_id: gatewayOrderId,
          razorpay_payment_id: `pay_${gatewayOrderId}`,
          razorpay_signature: 'forged',
        },
        { cookies: `${CUSTOMER_COOKIE}=${customer.token}` },
      ),
    )) as Response

    expect(response.status).toBe(400)
    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
    expect(mocks.sendOrderMails).not.toHaveBeenCalled()
  })

  it('refuses a payment that does not match the gateway order and writes nothing', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const gatewayOrderId = `order_${run}_v3`

    stageGatewayOrder([itemFor(product, 0)], customer, gatewayOrderId)
    mocks.fetchRazorpayPayment.mockResolvedValue({
      amount: 999, // The browser paid a different amount.
      currency: 'INR',
      id: `pay_${gatewayOrderId}`,
      order_id: gatewayOrderId,
      status: 'captured',
    })

    const response = (await verifyOrderEndpoint.handler(
      createRequest(
        {
          razorpay_order_id: gatewayOrderId,
          razorpay_payment_id: `pay_${gatewayOrderId}`,
          razorpay_signature: 'sig',
        },
        { cookies: `${CUSTOMER_COOKIE}=${customer.token}` },
      ),
    )) as Response

    expect(response.status).toBe(400)
    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
  })

  it('answers 404 for somebody else\u2019s gateway order rather than confirming it exists', async () => {
    const owner = await createCustomer()
    const stranger = await createCustomer()
    const product = await createProduct()
    const gatewayOrderId = `order_${run}_v4`

    stageGatewayOrder([itemFor(product, 0)], owner, gatewayOrderId)

    const response = (await verifyOrderEndpoint.handler(
      createRequest(
        {
          razorpay_order_id: gatewayOrderId,
          razorpay_payment_id: `pay_${gatewayOrderId}`,
          razorpay_signature: 'sig',
        },
        { cookies: `${CUSTOMER_COOKIE}=${stranger.token}` },
      ),
    )) as Response

    expect(response.status).toBe(404)
    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
  })

  it('answers 404 when the gateway order carries no readable intent', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_v5`

    mocks.verifyPaymentSignature.mockReturnValue(true)
    mocks.fetchRazorpayOrder.mockResolvedValue({
      amount: 150000,
      currency: 'INR',
      id: gatewayOrderId,
      notes: {},
    })

    const response = (await verifyOrderEndpoint.handler(
      createRequest(
        {
          razorpay_order_id: gatewayOrderId,
          razorpay_payment_id: `pay_${gatewayOrderId}`,
          razorpay_signature: 'sig',
        },
        { cookies: `${CUSTOMER_COOKIE}=${customer.token}` },
      ),
    )) as Response

    expect(response.status).toBe(404)
    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
  })

  it('records a repeated return once, does not mail twice, and still clears the cart', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const gatewayOrderId = `order_${run}_v6`

    stageGatewayOrder([itemFor(product, 0)], customer, gatewayOrderId)

    const body = {
      razorpay_order_id: gatewayOrderId,
      razorpay_payment_id: `pay_${gatewayOrderId}`,
      razorpay_signature: 'sig',
    }

    const options = { cookies: `${CUSTOMER_COOKIE}=${customer.token}` }

    const first = (await verifyOrderEndpoint.handler(
      createRequest(body, options),
    )) as Response
    const second = (await verifyOrderEndpoint.handler(
      createRequest(body, options),
    )) as Response

    const firstBody = (await first.json()) as { orderId: number }
    const secondBody = (await second.json()) as { orderId: number }

    orderIDs.push(firstBody.orderId)

    expect(second.status).toBe(200)
    expect(secondBody.orderId).toBe(firstBody.orderId)
    expect(second.headers.get('set-cookie')).toContain('Max-Age=0')
    expect(mocks.sendOrderMails).toHaveBeenCalledOnce()
  })

  it('refuses a signed out visitor', async () => {
    const response = (await verifyOrderEndpoint.handler(
      createRequest({
        razorpay_order_id: 'order_x',
        razorpay_payment_id: 'pay_x',
        razorpay_signature: 'sig',
      }),
    )) as Response

    expect(response.status).toBe(401)
  })
})

describe('the orders collection', () => {
  const createRow = async (customer: { id: number | string }, gatewayOrderId: string) => {
    const row = (await payload.create({
      collection: 'orders',
      data: {
        customer: customer.id as number,
        delivery: {
          addressLine1: '12 Test Road',
          city: 'Pune',
          name: 'Asha Kale',
          phone: '9876543210',
          pincode: '411001',
          state: 'Maharashtra',
        },
        gatewayOrderId,
        items: [{ days: 5, durationLabel: 'One week', productTitle: 'Lunch plan', unitPrice: 150000 }],
        subtotal: 150000,
        total: 150000,
      },
      depth: 0,
      overrideAccess: true,
    })) as Order

    orderIDs.push(row.id)
    return row
  }

  it('never lets a sessionless caller read orders through the collection API', async () => {
    // Payload's local API answers a refused access rule by throwing, the way
    // the REST layer turns it into a 403. A sessionless read is refused.
    await expect(
      payload.find({
        collection: 'orders',
        depth: 0,
        overrideAccess: false,
        where: {},
      }),
    ).rejects.toThrow()
  })

  it('keeps a customer session from reading another customer\u2019s order through the collection API', async () => {
    const owner = await createCustomer()
    const stranger = await createCustomer()
    const row = await createRow(owner, `order_${run}_acl`)

    // Authenticate as the stranger and read with the collection's own access rule.
    const strangerLogin = await payload.login({
      collection: 'customers',
      data: { email: stranger.email, password: PASSWORD },
    })

    const strangerRow = (await payload.findByID({
      collection: 'customers',
      depth: 0,
      id: stranger.id,
      overrideAccess: true,
    })) as Customer

    expect(String(strangerRow.id)).toBe(String(stranger.id))

    // Payload's local API carries no request context here, so prove the rule
    // the way the REST layer would evaluate it: a where clause limited to the
    // caller. The stranger's id cannot match the owner's row.
    const found = await payload.find({
      collection: 'orders',
      depth: 0,
      overrideAccess: false,
      user: { id: stranger.id, collection: 'customers' } as never,
      where: { id: { equals: row.id } },
    })

    void strangerLogin
    expect(found.docs).toHaveLength(0)
  })
})
