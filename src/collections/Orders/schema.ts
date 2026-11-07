import { z } from 'zod'

import { customerProfileSchema } from '@/utilities/customerProfile'

/**
 * What the checkout may send, and nothing more (spec 0007).
 *
 * The browser sends the delivery details and the optional note. The lines are
 * never part of the request: the order endpoint reads the cart cookie itself,
 * so a crafted body cannot order a basket the customer never saw, and no price
 * or day count ever arrives from the browser. The delivery rules are the
 * profile rules of spec 0005, reused verbatim, so the checkout form and the
 * account form can never disagree about what an address is. The name is
 * checkout's own requirement, added on top.
 */

const required = (message: string) => z.string().trim().min(1, { message })

export const orderDeliverySchema = customerProfileSchema.extend({
  name: required('Enter a name for the delivery.'),
})

export const orderCreateSchema = z.object({
  delivery: orderDeliverySchema,
  note: z
    .string()
    .trim()
    .max(1000, { message: 'Keep the note to 1000 characters or fewer.' })
    .optional()
    .default(''),
})

/**
 * What the Razorpay popup hands back on success. The names are Razorpay's own,
 * because the browser forwards the handler's response untouched.
 */
export const orderVerifySchema = z.object({
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
})
