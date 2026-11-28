/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'

import { renderOrder } from '../../src/email/templates/render'
import { cashDueLine, orderPaymentView } from '@/utilities/orderPaymentView'

/** How a cash order reads to the customer and the kitchen (spec 2026-11-28 cash on delivery). */

describe('orderPaymentView', () => {
  it('reads an online order exactly as before', () => {
    const view = orderPaymentView({ paymentState: 'paid', paymentType: 'online', total: 150000 })

    expect(view.cash).toBe(false)
    expect(view.statusLabel).toBe('Paid')
    expect(view.amountLabel).toBe('Amount paid')
    expect(view.cashLine).toBeNull()
  })

  it('reads a cash-due order as placed, with the amount due', () => {
    const view = orderPaymentView({ paymentState: 'cashDue', paymentType: 'cash', total: 150000 })

    expect(view.cash).toBe(true)
    expect(view.statusLabel).toBe('Cash due')
    expect(view.amountLabel).toBe('Amount due')
    expect(view.cashLine).toBe('Cash on delivery: ₹1,500 due at your first delivery.')
  })

  it('reads a collected cash order as paid in cash', () => {
    const view = orderPaymentView({ paymentState: 'collected', paymentType: 'cash', total: 150000 })

    expect(view.statusLabel).toBe('Paid in cash')
    expect(view.amountLabel).toBe('Amount paid')
    expect(view.cashLine).toBeNull()
  })

  it('reads a cancelled cash order as cancelled', () => {
    const view = orderPaymentView({ paymentState: 'cancelled', paymentType: 'cash', total: 150000 })

    expect(view.statusLabel).toBe('Cancelled')
    expect(view.cashLine).toBeNull()
  })

  it('treats an order from before cash on delivery as online and paid', () => {
    expect(orderPaymentView({ total: 1000 }).statusLabel).toBe('Paid')
  })
})

describe('order email for a cash order', () => {
  const base = {
    intro: 'Thank you.',
    lines: [{ amountLabel: '₹1,500', durationLabel: 'One week', title: 'Lunch plan' }],
    paymentId: '',
    totalLabel: '₹1,500',
  }

  it('renders the cash line for a cash order', async () => {
    const { html, text } = await renderOrder({
      ...base,
      cashLine: cashDueLine(150000),
      variant: 'confirmation',
    })

    expect(text).toContain('Cash on delivery: ₹1,500 due at your first delivery.')
    expect(text).not.toContain('Payment id')
    expect(html).toContain('Your UNAVE order is placed')
  })

  it('tells the kitchen the cash is due', async () => {
    const { text } = await renderOrder({
      ...base,
      cashLine: 'Cash due: ₹1,500, to collect at the first delivery.',
      variant: 'kitchenNotice',
    })

    expect(text).toContain('Cash due')
    expect(text).toMatch(/new cash on delivery order from the website/i)
    expect(text).not.toContain('Payment id')
  })

  it('keeps the payment id on an online order', async () => {
    const { text } = await renderOrder({ ...base, paymentId: 'pay_123', variant: 'confirmation' })

    expect(text).toContain('Payment id: pay_123')
    expect(text).toMatch(/your unave order is confirmed/i)
  })
})
