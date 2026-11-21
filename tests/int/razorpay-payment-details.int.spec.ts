import { describe, expect, it } from 'vitest'

import { paymentDetailsFrom, paymentMethodLabel } from '@/utilities/razorpayPaymentDetails'

/**
 * What an order keeps of Razorpay's payment record. The record arrives from
 * the gateway (the payments API on the browser return, the webhook's
 * payment entity otherwise), so only well-formed values are kept and anything
 * absent stays absent: the admin shows only details Razorpay actually sent.
 * Samples follow https://razorpay.com/docs/webhooks/payloads/payments/.
 */

const base = {
  id: 'pay_DESp9bgForNoUd',
  entity: 'payment',
  amount: 100,
  currency: 'INR',
  status: 'captured',
  order_id: 'order_DESoU0U4ikYA19',
  captured: true,
  email: 'gaurav.kumar@example.com',
  contact: '+919876543210',
  created_at: 1567674797,
}

describe('razorpay payment details', () => {
  it('keeps a UPI payment\'s id, reference, fee and payer', () => {
    expect(
      paymentDetailsFrom({
        ...base,
        method: 'upi',
        vpa: 'gaurav.kumar@upi',
        fee: 2,
        tax: 0,
        bank: null,
        wallet: null,
        card: null,
        acquirer_data: { rrn: '322206890934', upi_transaction_id: 'AXI8a2b3c' },
      }),
    ).toEqual({
      method: 'upi',
      vpa: 'gaurav.kumar@upi',
      bankReference: '322206890934',
      fee: 2,
      tax: 0,
      email: 'gaurav.kumar@example.com',
      contact: '+919876543210',
      capturedAt: '2019-09-05T09:13:17.000Z',
    })
  })

  it('keeps a card\'s network, type and last four digits, never the rest', () => {
    const details = paymentDetailsFrom({
      ...base,
      method: 'card',
      fee: null,
      tax: null,
      card: { id: 'card_1', last4: '0153', network: 'Visa', type: 'debit', iin: '999999', name: 'Gaurav' },
      acquirer_data: { auth_code: '828553', rrn: '322206890934' },
    })

    expect(details).toMatchObject({ method: 'card', cardNetwork: 'Visa', cardType: 'debit', cardLast4: '0153' })
    expect(details).not.toHaveProperty('fee')
    expect(JSON.stringify(details)).not.toContain('999999')
    expect(JSON.stringify(details)).not.toContain('Gaurav')
  })

  it('keeps the bank of a netbanking payment and the wallet of a wallet payment', () => {
    expect(paymentDetailsFrom({ ...base, method: 'netbanking', bank: 'HDFC' })).toMatchObject({ bank: 'HDFC' })
    expect(paymentDetailsFrom({ ...base, method: 'wallet', wallet: 'payzapp' })).toMatchObject({ wallet: 'payzapp' })
  })

  it('falls back to the UPI transaction id when there is no RRN', () => {
    expect(
      paymentDetailsFrom({ ...base, method: 'upi', acquirer_data: { upi_transaction_id: 'AXI8a2b3c' } }),
    ).toMatchObject({ bankReference: 'AXI8a2b3c' })
  })

  it('drops values that are missing, blank or the wrong shape', () => {
    expect(
      paymentDetailsFrom({
        method: '',
        vpa: 42,
        email: '   ',
        fee: -5,
        tax: 1.5,
        created_at: 'yesterday',
        card: { last4: '12345', network: '' },
        acquirer_data: 'nope',
      }),
    ).toEqual({})
    expect(paymentDetailsFrom(null)).toEqual({})
    expect(paymentDetailsFrom('pay_1')).toEqual({})
  })

  it('names the method the way staff read it', () => {
    expect(paymentMethodLabel('upi')).toBe('UPI')
    expect(paymentMethodLabel('card')).toBe('Card')
    expect(paymentMethodLabel('netbanking')).toBe('Netbanking')
    expect(paymentMethodLabel('wallet')).toBe('Wallet')
    expect(paymentMethodLabel('emi')).toBe('EMI')
    expect(paymentMethodLabel('paylater')).toBe('Pay later')
    expect(paymentMethodLabel('cardless_emi')).toBe('Cardless emi')
  })
})
