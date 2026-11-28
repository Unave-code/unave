import { describe, expect, it } from 'vitest'

import { enquirySchema } from '@/collections/Enquiries/schema'
import { orderCreateSchema, orderVerifySchema } from '@/collections/Orders/schema'

/**
 * The request schemas the checkout and the contact form are gated by. The
 * endpoints are tested end to end elsewhere; these hold the rules themselves.
 */

const delivery = {
  city: 'Chennai',
  line1: '12 Gandhi Street',
  name: 'Priya',
  phone: '+91 98765-43210',
  pincode: '600001',
  state: 'Tamil Nadu',
}

const issues = (result: { error?: { issues: { path: PropertyKey[] }[] }; success: boolean }) =>
  result.success ? [] : result.error!.issues.map((issue) => issue.path.join('.'))

describe('orderCreateSchema', () => {
  it('accepts a full delivery and fills the defaults', () => {
    const result = orderCreateSchema.safeParse({ delivery })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      delivery: { ...delivery, foodPreference: 'none', line2: '' },
      note: '',
    })
  })

  it('trims what the customer typed', () => {
    const result = orderCreateSchema.parse({ delivery: { ...delivery, city: '  Chennai  ' }, note: '  ring twice ' })
    expect(result.delivery.city).toBe('Chennai')
    expect(result.note).toBe('ring twice')
  })

  it('requires a name for the delivery on top of the profile rules', () => {
    const { name: _dropped, ...noName } = delivery
    expect(issues(orderCreateSchema.safeParse({ delivery: noName }))).toContain('delivery.name')
    expect(issues(orderCreateSchema.safeParse({ delivery: { ...delivery, name: '   ' } }))).toContain('delivery.name')
  })

  it('refuses a pincode that is not six digits', () => {
    expect(issues(orderCreateSchema.safeParse({ delivery: { ...delivery, pincode: '60001' } }))).toEqual([
      'delivery.pincode',
    ])
  })

  it('refuses an unknown food preference', () => {
    const result = orderCreateSchema.safeParse({ delivery: { ...delivery, foodPreference: 'keto' } })
    expect(issues(result)).toEqual(['delivery.foodPreference'])
  })

  it('caps the note at 1000 characters', () => {
    expect(orderCreateSchema.safeParse({ delivery, note: 'a'.repeat(1000) }).success).toBe(true)
    expect(issues(orderCreateSchema.safeParse({ delivery, note: 'a'.repeat(1001) }))).toEqual(['note'])
  })

  it('never lets a price or line through from the browser', () => {
    const result = orderCreateSchema.parse({ delivery, lines: [{ price: 1 }], total: 1 })
    expect(result).not.toHaveProperty('lines')
    expect(result).not.toHaveProperty('total')
  })
})

describe('orderVerifySchema', () => {
  const ok = { razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig' }

  it('accepts the three ids Razorpay hands back', () => {
    expect(orderVerifySchema.parse(ok)).toEqual(ok)
  })

  it('refuses a blank id', () => {
    expect(issues(orderVerifySchema.safeParse({ ...ok, razorpay_signature: '  ' }))).toEqual(['razorpay_signature'])
  })
})

describe('enquirySchema', () => {
  const enquiry = {
    email: '  Someone@Example.COM ',
    message: 'Do you deliver to Adyar?',
    name: 'Ravi',
    phone: '',
  }

  it('lower-cases and trims the email, and allows no phone', () => {
    const result = enquirySchema.parse(enquiry)
    expect(result.email).toBe('someone@example.com')
    expect(result.phone).toBe('')
  })

  it('accepts a phone written with a plus, spaces and a leading zero', () => {
    expect(enquirySchema.safeParse({ ...enquiry, phone: '+91 98765 43210' }).success).toBe(true)
    expect(enquirySchema.safeParse({ ...enquiry, phone: '09876543210' }).success).toBe(true)
  })

  it('refuses a phone with fewer than ten digits or longer than 20 characters', () => {
    expect(issues(enquirySchema.safeParse({ ...enquiry, phone: '98765 43210' }))).toEqual([])
    expect(issues(enquirySchema.safeParse({ ...enquiry, phone: '98765 4321' }))).toEqual(['phone'])
    expect(issues(enquirySchema.safeParse({ ...enquiry, phone: '+91 (98765) - 43210 x' }))).toEqual(['phone'])
  })

  it('refuses an address with no domain', () => {
    expect(issues(enquirySchema.safeParse({ ...enquiry, email: 'someone@example' }))).toEqual(['email'])
  })

  it('needs at least ten characters of message after trimming', () => {
    expect(issues(enquirySchema.safeParse({ ...enquiry, message: '   hi there  ' }))).toEqual(['message'])
  })

  it('needs a name of two to 80 characters', () => {
    expect(issues(enquirySchema.safeParse({ ...enquiry, name: ' R ' }))).toEqual(['name'])
    expect(issues(enquirySchema.safeParse({ ...enquiry, name: 'R'.repeat(81) }))).toEqual(['name'])
  })
})
