'use client'

import { Lock, Mail, MapPin } from 'lucide-react'
import React, { useState } from 'react'
import Script from 'next/script'

import { CTA_BASE, CTA_VARIANTS } from '@/components/Cta'
import { orderDeliverySchema } from '@/collections/Orders/schema'
import { toFieldErrors, type FieldErrors } from '@/auth/password/schema'
import { cn } from '@/utilities/ui'

import {
  CHECKOUT_ADDRESS_LABEL,
  CHECKOUT_ADDRESS_OPTIONAL_LABEL,
  CHECKOUT_CITY_LABEL,
  CHECKOUT_DELIVERY_HEADING,
  CHECKOUT_DELIVERY_INTRO,
  CHECKOUT_NAME_LABEL,
  CHECKOUT_NOTE_LABEL,
  CHECKOUT_NOTE_PLACEHOLDER,
  CHECKOUT_PAY_CTA,
  CHECKOUT_PAY_PENDING,
  CHECKOUT_PHONE_LABEL,
  CHECKOUT_PINCODE_LABEL,
  CHECKOUT_STATE_LABEL,
} from './copy'
import { useRazorpayCheckout } from './useRazorpayCheckout'

/**
 * The checkout form (spec 0007, AC-4 and AC-5).
 *
 * It posts the delivery details and the optional note to
 * `/api/orders/create`, then opens the Razorpay popup with what comes back. The
 * lines are never part of the request: the server reads the cart cookie itself,
 * resolves every line from the product records, and opens the gateway order for the
 * sum, so this component never sends an amount and never needs to be trusted.
 * When the popup reports success, the browser posts the returned values to
 * `/api/orders/verify`, which writes the paid order and answers its id, and the
 * browser walks to that order page. A confirmation that never arrives leaves the
 * payment to the signed webhook and shows one plain sentence instead of a page
 * for an order that may not exist.
 *
 * The delivery rules are the same Zod schema the endpoint enforces, so a value
 * the browser accepts is a value the server accepts too.
 */

const FIELD_LABEL = 'text-ink-900 block text-sm font-semibold'
const FIELD_ERROR = 'text-error mt-1.5 text-sm'
const FIELD_INPUT =
  'border-line text-ink-900 hover:border-ink-400 bg-white focus:border-green-700 focus:ring-green-500 mt-2 block h-12 w-full rounded-sm border px-4 text-base transition-colors focus:ring-[3px] focus:outline-none motion-reduce:transition-none'

/** One delivery field: its label, the input (id `checkout-<name>`) and its error. */
const CheckoutField: React.FC<{
  autoComplete: string
  defaultValue: string
  error?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  label: string
  name: string
  type?: string
}> = ({ autoComplete, defaultValue, error, inputMode, label, name, type }) => (
  <div>
    <label className={FIELD_LABEL} htmlFor={`checkout-${name}`}>
      {label}
    </label>
    <input
      autoComplete={autoComplete}
      className={cn(FIELD_INPUT, error && 'border-red-600')}
      defaultValue={defaultValue}
      id={`checkout-${name}`}
      inputMode={inputMode}
      name={name}
      type={type}
    />
    {error ? <p className={FIELD_ERROR}>{error}</p> : null}
  </div>
)

export const CheckoutForm: React.FC<{
  defaults: {
    city: string
    foodPreference: string
    line1: string
    line2: string
    name: string
    phone: string
    pincode: string
    state: string
  }
  email: string
  /** The cart total, already formatted, shown on the pay button. */
  total: string
}> = ({ defaults, email, total }) => {
  const [errors, setErrors] = useState<FieldErrors>({})
  const { busy, message, pay } = useRazorpayCheckout(email)

  const readValue = (field: string): string =>
    (document.getElementById(`checkout-${field}`) as HTMLInputElement | null)?.value?.trim() ?? ''

  const readNote = (): string =>
    (document.getElementById('checkout-note') as HTMLTextAreaElement | null)?.value?.trim() ?? ''

  const startPayment = async () => {
    const delivery = {
      city: readValue('city'),
      foodPreference: readValue('foodPreference'),
      line1: readValue('line1'),
      line2: readValue('line2'),
      name: readValue('name'),
      phone: readValue('phone'),
      pincode: readValue('pincode'),
      state: readValue('state'),
    }

    const parsed = orderDeliverySchema.safeParse(delivery)

    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error))
      return
    }

    setErrors({})
    await pay(parsed, readNote())
  }

  return (
    <div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      <form
        className="bg-card flex flex-col gap-5 rounded-2xl p-6 shadow-sm sm:p-8"
        method="post"
        onSubmit={(event) => {
          event.preventDefault()
          void startPayment()
        }}
        noValidate
      >
        <input
          id="checkout-foodPreference"
          name="foodPreference"
          type="hidden"
          value={defaults.foodPreference}
        />
        <div>
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-green-900">
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-full bg-green-50 text-green-700"
            >
              <MapPin className="size-4" strokeWidth={2} />
            </span>
            {CHECKOUT_DELIVERY_HEADING}
          </h2>
          <p className="text-ink-600 mt-2 text-sm leading-6">{CHECKOUT_DELIVERY_INTRO}</p>
          <p className="text-ink-600 mt-3 inline-flex items-center gap-2 rounded-pill bg-green-50 px-3 py-1.5 text-sm">
            <Mail aria-hidden="true" className="size-4 text-green-700" strokeWidth={2} />
            <span>
              Signed in as <span className="text-ink-900 font-semibold">{email}</span>
            </span>
          </p>
        </div>

        <CheckoutField autoComplete="name" defaultValue={defaults.name} error={errors.name} label={CHECKOUT_NAME_LABEL} name="name" type="text" />

        <div className="grid gap-5 sm:grid-cols-2">
          <CheckoutField autoComplete="tel" defaultValue={defaults.phone} error={errors.phone} inputMode="tel" label={CHECKOUT_PHONE_LABEL} name="phone" type="tel" />

          <CheckoutField autoComplete="postal-code" defaultValue={defaults.pincode} error={errors.pincode} inputMode="numeric" label={CHECKOUT_PINCODE_LABEL} name="pincode" />
        </div>

        <CheckoutField autoComplete="address-line1" defaultValue={defaults.line1} error={errors.line1} label={CHECKOUT_ADDRESS_LABEL} name="line1" type="text" />

        <CheckoutField autoComplete="address-line2" defaultValue={defaults.line2} label={CHECKOUT_ADDRESS_OPTIONAL_LABEL} name="line2" type="text" />

        <div className="grid gap-5 sm:grid-cols-2">
          <CheckoutField autoComplete="address-level2" defaultValue={defaults.city} error={errors.city} label={CHECKOUT_CITY_LABEL} name="city" type="text" />

          <CheckoutField autoComplete="address-level1" defaultValue={defaults.state} error={errors.state} label={CHECKOUT_STATE_LABEL} name="state" type="text" />
        </div>

        <div>
          <label className={FIELD_LABEL} htmlFor="checkout-note">
            {CHECKOUT_NOTE_LABEL}
          </label>
          <textarea
            className={cn(FIELD_INPUT, 'h-auto min-h-24 py-2')}
            id="checkout-note"
            name="note"
            placeholder={CHECKOUT_NOTE_PLACEHOLDER}
            rows={3}
          />
        </div>

        {message ? (
          <p className="text-ink-900 bg-gold-100 rounded-sm p-4 text-sm leading-6" role="alert">
            {message}
          </p>
        ) : null}

        <div className="border-line mt-1 border-t pt-5">
          <button
            className={cn(CTA_BASE, CTA_VARIANTS.primary, 'w-full disabled:opacity-70')}
            disabled={busy}
            type="submit"
          >
            <Lock aria-hidden="true" className="size-4" strokeWidth={2.25} />
            {busy ? CHECKOUT_PAY_PENDING : `${CHECKOUT_PAY_CTA} · ${total}`}
          </button>
          <p className="text-ink-600 mt-3 text-center text-sm">
            Payment opens in a secure Razorpay window.
          </p>
        </div>
      </form>
    </div>
  )
}
