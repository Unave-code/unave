/**
 * @vitest-environment node
 */
import { createHmac } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import type { CheckoutIntent, Customer, Order } from '@/payload-types'
import { testAudienceId } from '../helpers/audience'

// The dev database is remote, so a single test can make several slow round trips,
// and the first `getPayload` in a worker pulls the schema from it.
vi.setConfig({ hookTimeout: 120_000, testTimeout: 60_000 })

/**
 * The Razorpay webhook route.
 *
 * The HMAC is real: the module is imported with a webhook secret planted in the
 * environment before it loads, so the signature checks below are the same
 * computation Razorpay does, not a mock agreeing with itself. The mail send is
 * mocked, because a mail transport has no place in what this file proves.
 *
 * This route is now the one that matters when the browser never comes back, so
 * these tests hold it to writing the paid order itself from the checkout intent
 * the gateway order carries, and to writing nothing when a check fails.
 */

const mocks = vi.hoisted(() => {
  const secret = `whsec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // Hoisted above every import, so the razorpay module reads the secret when it
  // first loads and the HMAC below is the same computation Razorpay does.
  process.env.RAZORPAY_WEBHOOK_SECRET = secret

  return {
    fetchRazorpayOrder: vi.fn(),
    sendOrderMails: vi.fn(),
    sendPaymentAlertMail: vi.fn(),
    secret,
  }
})

const WEBHOOK_SECRET = mocks.secret

vi.mock('../../src/utilities/razorpay', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utilities/razorpay')>()

  return {
    ...actual,
    fetchRazorpayOrder: mocks.fetchRazorpayOrder,
  }
})

vi.mock('../../src/collections/Orders/mail', () => ({
  sendOrderMails: mocks.sendOrderMails,
  sendPaymentAlertMail: mocks.sendPaymentAlertMail,
}))

import { POST } from '../../src/app/(frontend)/api/razorpay/webhook/route'
import { sweepRun } from '../helpers/sweepRun'

let payload: Payload
let audienceId: number

const run = `it-hook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const orderIDs: (number | string)[] = []
const customerIDs: (number | string)[] = []
const intentGatewayIds: string[] = []
let productId: number | string
let subcategoryId: number | string

const TOTAL = 150000

const createCustomer = async (): Promise<Customer> => {
  const created = (await payload.create({
    collection: 'customers',
    data: {
      email: `${run}-${Math.random().toString(36).slice(2, 8)}@unave.test`,
      name: 'Test Customer',
      password: 'correct-horse-battery',
    },
    depth: 0,
    disableVerificationEmail: true,
    overrideAccess: true,
  })) as Customer

  customerIDs.push(created.id)
  return created
}

/** The intent the checkout endpoint would have stored before payment opened. */
const stageIntent = async (customer: Customer, gatewayOrderId: string): Promise<void> => {
  await payload.create({
    collection: 'checkout-intents',
    data: {
      customer: Number(customer.id),
      delivery: {
        addressLine1: '12 Test Road',
        city: 'Pune',
        foodPreference: 'none',
        name: 'Asha Kale',
        phone: '9876543210',
        pincode: '411001',
        state: 'Maharashtra',
      },
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      gatewayOrderId,
      items: [
        {
          days: 5,
          durationLabel: 'One week',
          productId: Number(productId),
          productRef: Number(productId),
          productTitle: 'Lunch plan',
          qty: 1,
          unitPrice: TOTAL,
        },
      ],
      total: TOTAL,
    },
    depth: 0,
    overrideAccess: true,
  })

  intentGatewayIds.push(gatewayOrderId)
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

const sign = (rawBody: string): string =>
  createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')

const post = async (rawBody: string, signature: string | null): Promise<Response> => {
  const headers = new Headers({ 'content-type': 'application/json' })

  if (signature !== null) headers.set('x-razorpay-signature', signature)

  return POST(
    new Request('http://localhost:3000/api/razorpay/webhook', {
      body: rawBody,
      headers,
      method: 'POST',
    }),
  )
}

const capturedEvent = (
  orderId: string,
  paymentId: string,
  options: { amount?: number; omitOrder?: boolean } = {},
): string => {
  const amount = options.amount ?? TOTAL

  return JSON.stringify({
    event: 'payment.captured',
    payload: {
      ...(options.omitOrder ? {} : { order: { entity: { amount, currency: 'INR', id: orderId } } }),
      payment: {
        amount,
        currency: 'INR',
        id: paymentId,
        order_id: orderId,
        status: 'captured',
      },
    },
  })
}

/**
 * The nesting Razorpay's docs show for a real delivery: each payload entry is
 * wrapped in an `entity` object. The route must write the order on this shape,
 * not only on the flat shape the hand built tests below use.
 */
const capturedEventNested = (orderId: string, paymentId: string, extra: Record<string, unknown> = {}): string =>
  JSON.stringify({
    account_id: 'acc_test',
    contains: ['order', 'payment'],
    created_at: 1784541436,
    entity: 'event',
    event: 'payment.captured',
    payload: {
      order: { entity: { amount: TOTAL, currency: 'INR', entity: 'order', id: orderId } },
      payment: {
        entity: {
          amount: TOTAL,
          currency: 'INR',
          entity: 'payment',
          id: paymentId,
          order_id: orderId,
          status: 'captured',
          ...extra,
        },
      },
    },
  })

beforeAll(async () => {
  payload = await getPayload({ config })
  audienceId = await testAudienceId(payload)

  const subcategory = await payload.create({
    collection: 'subcategories',
    context: { disableRevalidate: true },
    data: { category: 'ready-to-eat', slug: '', title: `${run} tiffin` },
    overrideAccess: true,
  })

  subcategoryId = subcategory.id

  const product = await payload.create({
    collection: 'products',
    data: {
      available: true,
      durations: [{ days: 5, label: 'One week', price: TOTAL }],
      slug: `${run}-plan`,
      title: 'Lunch plan',
      type: 'plan' as const,
      mealPlan: true,
      category: 'ready-to-eat',
      subcategory: subcategoryId as number,
      audience: audienceId,
    },
    depth: 0,
    // The revalidateProducts hook calls Next's revalidateTag, which only exists
    // inside the Next runtime this spec does not run in.
    context: { disableRevalidate: true },
    overrideAccess: true,
  })

  productId = product.id
})

beforeEach(() => {
  mocks.fetchRazorpayOrder.mockReset()
  mocks.sendOrderMails.mockReset()
  mocks.sendOrderMails.mockResolvedValue({ sent: true })
  mocks.sendPaymentAlertMail.mockReset()
  mocks.sendPaymentAlertMail.mockResolvedValue(undefined)
})

afterAll(async () => {
  for (const gatewayOrderId of intentGatewayIds) {
    try {
      const found = await payload.find({
        collection: 'checkout-intents',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: { gatewayOrderId: { equals: gatewayOrderId } },
      })

      const intent = found.docs[0] as CheckoutIntent | undefined

      if (intent) {
        await payload.delete({
          collection: 'checkout-intents',
          id: intent.id,
          overrideAccess: true,
        })
      }
    } catch {
      // Best effort cleanup.
    }
  }

  for (const id of orderIDs) {
    try {
      await payload.delete({ collection: 'orders', id, overrideAccess: true })
    } catch {
      // Best effort cleanup.
    }
  }

  try {
    await payload.delete({
      collection: 'products',
      id: productId,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
  } catch {
    // Best effort cleanup.
  }

  try {
    await payload.delete({
      collection: 'subcategories',
      context: { disableRevalidate: true },
      id: subcategoryId,
      overrideAccess: true,
    })
  } catch {
    // Best effort cleanup.
  }

  for (const id of customerIDs) {
    try {
      await payload.delete({ collection: 'customers', id, overrideAccess: true })
    } catch {
      // Best effort cleanup.
    }
  }

  await sweepRun(payload, run)
})

describe('the Razorpay webhook', () => {
  it('writes the paid order from a signed payment.captured event', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_a`

    await stageIntent(customer, gatewayOrderId)

    const raw = capturedEvent(gatewayOrderId, 'pay_hook_1')
    const response = await post(raw, sign(raw))

    expect(response.status).toBe(200)

    const after = await findOrderByGateway(gatewayOrderId)
    expect(after).not.toBeNull()
    orderIDs.push(after!.id)

    expect(after!.total).toBe(TOTAL)
    expect(String(after!.customer)).toBe(String(customer.id))
    expect(after!.gatewayPaymentId).toBe('pay_hook_1')
    expect(after!.delivery?.name).toBe('Asha Kale')
    expect(after!.items?.[0]?.productTitle).toBe('Lunch plan')
    expect(mocks.sendOrderMails).toHaveBeenCalledOnce()
  })

  it('writes the order on the nesting Razorpay actually sends', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_nested`

    await stageIntent(customer, gatewayOrderId)

    const raw = capturedEventNested(gatewayOrderId, 'pay_hook_nested')
    const response = await post(raw, sign(raw))

    expect(response.status).toBe(200)

    const after = await findOrderByGateway(gatewayOrderId)
    expect(after).not.toBeNull()
    orderIDs.push(after!.id)

    expect(after!.gatewayPaymentId).toBe('pay_hook_nested')
    expect(mocks.sendOrderMails).toHaveBeenCalledOnce()
  })

  it('keeps the payment details the event carries', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_details`

    await stageIntent(customer, gatewayOrderId)

    const raw = capturedEventNested(gatewayOrderId, 'pay_hook_details', {
      acquirer_data: { rrn: '322206890934' },
      contact: '+919876543210',
      created_at: 1567674797,
      email: 'asha@example.com',
      fee: 354,
      method: 'upi',
      tax: 54,
      vpa: 'asha@okhdfc',
    })
    const response = await post(raw, sign(raw))

    expect(response.status).toBe(200)

    const after = await findOrderByGateway(gatewayOrderId)
    expect(after).not.toBeNull()
    orderIDs.push(after!.id)

    expect(after!.payment).toMatchObject({
      bankReference: '322206890934',
      capturedAt: '2019-09-05T09:13:17.000Z',
      contact: '+919876543210',
      email: 'asha@example.com',
      fee: 354,
      method: 'upi',
      tax: 54,
      vpa: 'asha@okhdfc',
    })
  })

  it('answers Razorpay before the order emails finish sending', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_fast`

    await stageIntent(customer, gatewayOrderId)
    // A mail server that never answers: the webhook must still reply at once,
    // since Razorpay treats a reply slower than five seconds as a failure.
    mocks.sendOrderMails.mockImplementation(() => new Promise(() => {}))

    const raw = capturedEvent(gatewayOrderId, 'pay_hook_fast')
    const outcome = await Promise.race([
      post(raw, sign(raw)).then((response) => response.status),
      new Promise<'timed out'>((resolve) => setTimeout(() => resolve('timed out'), 8000)),
    ])

    expect(outcome).toBe(200)

    const after = await findOrderByGateway(gatewayOrderId)
    expect(after).not.toBeNull()
    orderIDs.push(after!.id)
    expect(mocks.sendOrderMails).toHaveBeenCalledOnce()
  })

  it('refuses an unsigned or forged body without writing anything', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_b`

    await stageIntent(customer, gatewayOrderId)

    const raw = capturedEvent(gatewayOrderId, 'pay_hook_2')

    const unsigned = await post(raw, null)
    expect(unsigned.status).toBe(400)

    const forged = await post(raw, 'a'.repeat(64))
    expect(forged.status).toBe(400)

    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
    expect(mocks.sendOrderMails).not.toHaveBeenCalled()
  })

  it('writes nothing when the event amount does not match the intent', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_c`

    await stageIntent(customer, gatewayOrderId)

    const raw = capturedEvent(gatewayOrderId, 'pay_hook_3', { amount: 1 })
    const response = await post(raw, sign(raw))

    expect(response.status).toBe(200)

    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
    expect(mocks.sendOrderMails).not.toHaveBeenCalled()
    expect(mocks.sendPaymentAlertMail).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ paymentId: 'pay_hook_3', reason: 'amount_mismatch' }),
    )
  })

  it('writes nothing when no intent was stored for the gateway order', async () => {
    const gatewayOrderId = `order_${run}_empty`

    const raw = capturedEvent(gatewayOrderId, 'pay_hook_4')
    const response = await post(raw, sign(raw))

    expect(response.status).toBe(200)

    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
    expect(mocks.sendOrderMails).not.toHaveBeenCalled()
    expect(mocks.sendPaymentAlertMail).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ paymentId: 'pay_hook_4', reason: 'intent_missing' }),
    )
  })

  it('answers retryably when the order cannot be saved, then writes it on the retry', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_writefail`

    await stageIntent(customer, gatewayOrderId)

    const realCreate = payload.create.bind(payload)
    const spy = vi.spyOn(payload, 'create').mockImplementation(((args: { collection: string }) => {
      if (args.collection === 'orders') return Promise.reject(new Error('database went away'))
      return realCreate(args as Parameters<typeof realCreate>[0])
    }) as typeof payload.create)

    const raw = capturedEvent(gatewayOrderId, 'pay_hook_writefail')
    let first: Response

    try {
      first = await post(raw, sign(raw))
    } finally {
      spy.mockRestore()
    }

    expect(first.status).toBe(500)
    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
    expect(mocks.sendOrderMails).not.toHaveBeenCalled()
    expect(mocks.sendPaymentAlertMail).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ paymentId: 'pay_hook_writefail', reason: 'write_failed' }),
    )

    // Razorpay's retry: the intent is still there, so the order is written once.
    const retry = await post(raw, sign(raw))
    expect(retry.status).toBe(200)

    const after = await findOrderByGateway(gatewayOrderId)
    expect(after).not.toBeNull()
    orderIDs.push(after!.id)
    expect(mocks.sendOrderMails).toHaveBeenCalledOnce()
  })

  it('ignores events that are not a captured payment', async () => {
    const gatewayOrderId = `order_${run}_d`

    const raw = JSON.stringify({
      event: 'payment.failed',
      payload: {
        payment: {
          amount: TOTAL,
          currency: 'INR',
          id: 'pay_hook_5',
          order_id: gatewayOrderId,
          status: 'failed',
        },
      },
    })

    const response = await post(raw, sign(raw))

    expect(response.status).toBe(200)

    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
    expect(mocks.sendOrderMails).not.toHaveBeenCalled()
  })

  it('answers a replay idempotently without writing twice or mailing again', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_e`

    await stageIntent(customer, gatewayOrderId)

    const raw = capturedEvent(gatewayOrderId, 'pay_hook_6')

    expect((await post(raw, sign(raw))).status).toBe(200)
    expect((await post(raw, sign(raw))).status).toBe(200)

    const after = await findOrderByGateway(gatewayOrderId)
    orderIDs.push(after!.id)

    expect(mocks.sendOrderMails).toHaveBeenCalledOnce()
  })

  it('reads the gateway order over REST when the event omits the order entity', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_fetch`

    await stageIntent(customer, gatewayOrderId)

    mocks.fetchRazorpayOrder.mockResolvedValue({
      amount: TOTAL,
      currency: 'INR',
      id: gatewayOrderId,
    })

    const raw = capturedEvent(gatewayOrderId, 'pay_hook_7', { omitOrder: true })
    const response = await post(raw, sign(raw))

    expect(response.status).toBe(200)
    expect(mocks.fetchRazorpayOrder).toHaveBeenCalledOnce()

    const after = await findOrderByGateway(gatewayOrderId)
    expect(after).not.toBeNull()
    orderIDs.push(after!.id)
  })

  it('answers retryably when the gateway cannot name the order', async () => {
    mocks.fetchRazorpayOrder.mockRejectedValue(new Error('razorpay_order_fetch_failed_404'))

    const raw = capturedEvent(`order_${run}_unknown`, 'pay_hook_8', { omitOrder: true })
    const response = await post(raw, sign(raw))

    expect(response.status).toBe(500)
    expect(await findOrderByGateway(`order_${run}_unknown`)).toBeNull()
    expect(mocks.sendOrderMails).not.toHaveBeenCalled()
  })
})
