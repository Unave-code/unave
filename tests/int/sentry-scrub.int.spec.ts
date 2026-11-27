import type { ErrorEvent, EventHint } from '@sentry/nextjs'
import { describe, expect, it } from 'vitest'

import { beforeSend, scrubString, scrubValue, sentryEnabled } from '@/sentry/scrub'

const pinoEvent = (level: ErrorEvent['level'], pino: Record<string, unknown>): ErrorEvent =>
  ({ contexts: { pino }, level, logger: 'pino', type: undefined }) as ErrorEvent

const hint = (originalException?: unknown): EventHint => ({ originalException })

describe('sentry beforeSend', () => {
  it('drops the Payload errors that describe the visitor, not the code', () => {
    const wrongPassword = Object.assign(new Error('The email or password provided is incorrect.'), {
      name: 'AuthenticationError',
    })
    expect(beforeSend({ type: undefined } as ErrorEvent, hint(wrongPassword))).toBeNull()

    const notFound = { exception: { values: [{ type: 'NotFound' }] }, type: undefined } as ErrorEvent
    expect(beforeSend(notFound, hint())).toBeNull()
  })

  it('keeps a real error', () => {
    expect(beforeSend({ type: undefined } as ErrorEvent, hint(new TypeError('x is undefined')))).not.toBeNull()
  })

  it('lets payment warnings through and keeps the rest of the warnings out', () => {
    expect(beforeSend(pinoEvent('warning', { msg: 'razorpay_webhook_amount_mismatch' }), hint())).not.toBeNull()
    expect(beforeSend(pinoEvent('warning', { msg: 'customer_login_cross_site_rejected' }), hint())).toBeNull()
  })

  it('keeps every logged error and groups it by its code', () => {
    const event = beforeSend(
      pinoEvent('error', { msg: 'razorpay_webhook_write_failed', order: 'order_123' }),
      hint('duplicate key value violates unique constraint'),
    )
    expect(event?.fingerprint).toEqual(['pino', 'razorpay_webhook_write_failed'])
  })

  it('never lets customer details or link tokens leave', () => {
    const event = beforeSend(
      {
        contexts: { pino: { customerEmail: 'asha@example.com', msg: 'order_return_write_failed', order: 7 } },
        exception: { values: [{ type: 'Error', value: 'mail to asha@example.com / 9876543210 failed' }] },
        extra: { address: '12 MG Road', note: 'ring +91 98765 43210' },
        level: 'error',
        logger: 'pino',
        request: {
          cookies: { 'unave-customer': 'jwt' },
          data: { password: 'hunter2' },
          headers: { cookie: 'a=b', 'user-agent': 'Mozilla/5.0' },
          query_string: 'token=abc',
          url: 'https://unave.in/reset-password?token=abc',
        },
        type: undefined,
        user: { email: 'asha@example.com', ip_address: '203.0.113.7' },
      } as ErrorEvent,
      hint(),
    )

    expect(event?.user).toBeUndefined()
    expect(event?.request).toEqual({
      headers: { 'user-agent': 'Mozilla/5.0' },
      url: 'https://unave.in/reset-password',
    })
    expect(event?.contexts?.pino).toEqual({
      customerEmail: '[redacted]',
      msg: 'order_return_write_failed',
      order: 7,
    })
    expect(event?.extra).toEqual({ address: '[redacted]', note: 'ring [redacted]' })
    expect(event?.exception?.values?.[0]?.value).toBe('mail to [redacted] / [redacted] failed')
  })
})

describe('sentry scrubbing helpers', () => {
  it('masks tokens in links but leaves ids alone', () => {
    expect(scrubString('/verify-email?token=abc&next=/account')).toBe('/verify-email?token=[redacted]&next=/account')
    expect(scrubString('pay_Abc123 for order 42')).toBe('pay_Abc123 for order 42')
  })

  it('redacts sensitive keys at any depth', () => {
    expect(scrubValue({ a: { b: [{ phone: '1', total: 500 }] } })).toEqual({
      a: { b: [{ phone: '[redacted]', total: 500 }] },
    })
  })

  it('stays off without a DSN, and outside a production build', () => {
    expect(sentryEnabled(undefined)).toBe(false)
    expect(sentryEnabled('https://key@o0.ingest.sentry.io/1')).toBe(false)
  })
})
