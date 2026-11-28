import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The Razorpay REST client (spec 0007), with fetch stubbed so nothing leaves
 * the machine. The keys are planted before the module loads, because it reads
 * them once at import time.
 */

const { KEY_ID, KEY_SECRET, WEBHOOK_SECRET } = vi.hoisted(() => {
  const keys = {
    KEY_ID: 'rzp_test_client_spec',
    KEY_SECRET: 'client-spec-key-secret',
    WEBHOOK_SECRET: 'client-spec-webhook-secret',
  }
  process.env.RAZORPAY_KEY_ID = keys.KEY_ID
  process.env.RAZORPAY_KEY_SECRET = keys.KEY_SECRET
  process.env.RAZORPAY_WEBHOOK_SECRET = keys.WEBHOOK_SECRET
  return keys
})

import {
  captureRazorpayPayment,
  createRazorpayOrder,
  fetchRazorpayOrder,
  fetchRazorpayPayment,
  isRazorpayConfigured,
  isWebhookConfigured,
  razorpayMode,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '@/utilities/razorpay'

const fetchMock = vi.fn()

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, status })

const expectedAuth = `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('configuration', () => {
  it('reports the gateway and webhook as configured when the keys are set', () => {
    expect(isRazorpayConfigured()).toBe(true)
    expect(isWebhookConfigured()).toBe(true)
  })

  it('reads test mode from the key id prefix', () => {
    expect(razorpayMode()).toBe('test')
  })
})

describe('createRazorpayOrder', () => {
  it('posts the amount in paise, INR, the receipt and notes with basic auth', async () => {
    fetchMock.mockResolvedValue(json({ amount: 120000, currency: 'INR', id: 'order_1' }))

    const order = await createRazorpayOrder(120000, 'rcpt_1', { product: 'thali' })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.razorpay.com/v1/orders')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe(expectedAuth)
    expect(JSON.parse(init.body)).toEqual({
      amount: 120000,
      currency: 'INR',
      notes: { product: 'thali' },
      receipt: 'rcpt_1',
    })
    expect(order).toEqual({ amount: 120000, currency: 'INR', id: 'order_1', notes: { product: 'thali' } })
  })

  it('throws with the status and a trimmed detail when the gateway refuses', async () => {
    fetchMock.mockResolvedValue(new Response('x'.repeat(500), { status: 400 }))

    const error = await createRazorpayOrder(100, 'r').catch((e: Error) => e)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toMatch(/^razorpay_order_create_failed_400: x+$/)
    // 200 characters of detail, never the whole body.
    expect((error as Error).message.length).toBe('razorpay_order_create_failed_400: '.length + 200)
  })

  it('rejects a response in a currency other than INR', async () => {
    fetchMock.mockResolvedValue(json({ amount: 100, currency: 'USD', id: 'order_1' }))

    await expect(createRazorpayOrder(100, 'r')).rejects.toThrow('razorpay_order_create_unexpected_response')
  })

  it('rejects a response with no order id', async () => {
    fetchMock.mockResolvedValue(json({ amount: 100, currency: 'INR' }))

    await expect(createRazorpayOrder(100, 'r')).rejects.toThrow('razorpay_order_create_unexpected_response')
  })
})

describe('fetchRazorpayOrder', () => {
  it('escapes the order id into the path and keeps the notes, amount paid and status', async () => {
    fetchMock.mockResolvedValue(
      json({ amount: 500, amount_paid: 500, currency: 'INR', id: 'order_2', notes: { a: '1' }, status: 'paid' }),
    )

    const order = await fetchRazorpayOrder('order/../2')

    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.razorpay.com/v1/orders/order%2F..%2F2')
    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBe(expectedAuth)
    expect(order).toEqual({
      amount: 500,
      amount_paid: 500,
      currency: 'INR',
      id: 'order_2',
      notes: { a: '1' },
      status: 'paid',
    })
  })

  it('drops amount paid and status when the gateway sends them in the wrong shape', async () => {
    fetchMock.mockResolvedValue(
      json({ amount: 500, amount_paid: '500', currency: 'INR', id: 'order_2', notes: {}, status: 7 }),
    )

    const order = await fetchRazorpayOrder('order_2')
    expect(order.amount_paid).toBeUndefined()
    expect(order.status).toBeUndefined()
  })

  it('rejects an order with no notes, since the checkout intent lives there', async () => {
    fetchMock.mockResolvedValue(json({ amount: 500, currency: 'INR', id: 'order_2' }))

    await expect(fetchRazorpayOrder('order_2')).rejects.toThrow('razorpay_order_unexpected_response')
  })

  it('throws with the status when the order cannot be read', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 404 }))

    await expect(fetchRazorpayOrder('order_x')).rejects.toThrow(/^razorpay_order_fetch_failed_404$/)
  })
})

describe('fetchRazorpayPayment and captureRazorpayPayment', () => {
  const payment = {
    amount: 120000,
    currency: 'INR',
    id: 'pay_1',
    method: 'upi',
    order_id: 'order_1',
    status: 'authorized',
    vpa: 'someone@okbank',
  }

  it('reads a payment back and keeps its details', async () => {
    fetchMock.mockResolvedValue(json(payment))

    const read = await fetchRazorpayPayment('pay_1')

    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.razorpay.com/v1/payments/pay_1')
    expect(read).toMatchObject({ amount: 120000, currency: 'INR', id: 'pay_1', order_id: 'order_1', status: 'authorized' })
    expect(read.details).toBeTypeOf('object')
  })

  it('rejects a payment record missing its order id', async () => {
    const { order_id: _dropped, ...broken } = payment
    fetchMock.mockResolvedValue(json(broken))

    await expect(fetchRazorpayPayment('pay_1')).rejects.toThrow('razorpay_payment_unexpected_response')
  })

  it('captures with the agreed amount in INR', async () => {
    fetchMock.mockResolvedValue(json({ ...payment, status: 'captured' }))

    const captured = await captureRazorpayPayment('pay_1', 120000)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.razorpay.com/v1/payments/pay_1/capture')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ amount: 120000, currency: 'INR' })
    expect(captured.status).toBe('captured')
  })

  it('throws with the status when a capture is refused', async () => {
    fetchMock.mockResolvedValue(new Response('already captured', { status: 400 }))

    await expect(captureRazorpayPayment('pay_1', 100)).rejects.toThrow(
      'razorpay_payment_capture_failed_400: already captured',
    )
  })
})

describe('verifyPaymentSignature', () => {
  const sign = (orderId: string, paymentId: string) =>
    createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex')

  it('accepts the HMAC of order id and payment id', () => {
    expect(verifyPaymentSignature('order_1', 'pay_1', sign('order_1', 'pay_1'))).toBe(true)
  })

  it('refuses a signature made for a different payment', () => {
    expect(verifyPaymentSignature('order_1', 'pay_2', sign('order_1', 'pay_1'))).toBe(false)
  })

  it('refuses an empty or wrong-length signature without throwing', () => {
    expect(verifyPaymentSignature('order_1', 'pay_1', '')).toBe(false)
    expect(verifyPaymentSignature('order_1', 'pay_1', 'abc')).toBe(false)
  })

  it('refuses a signature made with another secret', () => {
    const forged = createHmac('sha256', 'not-the-secret').update('order_1|pay_1').digest('hex')
    expect(verifyPaymentSignature('order_1', 'pay_1', forged)).toBe(false)
  })
})

describe('verifyWebhookSignature', () => {
  const body = '{"event":"payment.captured","payload":{}}'
  const sign = (raw: string) => createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex')

  it('accepts the HMAC of the raw body', () => {
    expect(verifyWebhookSignature(body, sign(body))).toBe(true)
  })

  it('refuses the same JSON with different whitespace', () => {
    const reserialized = JSON.stringify(JSON.parse(body), null, 2)
    expect(verifyWebhookSignature(reserialized, sign(body))).toBe(false)
  })

  it('refuses a missing signature', () => {
    expect(verifyWebhookSignature(body, '')).toBe(false)
  })
})
