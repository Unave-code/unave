'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { z } from 'zod'

import type { orderDeliverySchema } from '@/collections/Orders/schema'
import { readCreatedOrder } from '@/utilities/orderCreate'

import {
  CHECKOUT_CLOSED_MESSAGE,
  CHECKOUT_CONFIRMING_MESSAGE,
  CHECKOUT_FAILED_MESSAGE,
  CHECKOUT_SCRIPT_FAILED_MESSAGE,
} from './copy'

type RazorpayHandlerResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type RazorpayOptions = {
  amount: number
  currency: string
  description: string
  handler: (response: RazorpayHandlerResponse) => void
  key: string
  modal: { ondismiss: () => void }
  name: string
  order_id: string
  prefill: { email: string; name: string; phone: string }
  theme: { color: string }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void }
  }
}

type Status = 'idle' | 'starting' | 'paying'

type OrderDelivery = z.infer<typeof orderDeliverySchema>

/**
 * The payment half of checkout: create the order on the server, open the
 * Razorpay popup with what comes back, then verify the payment and walk to the
 * order page. `message` is the one sentence shown when any step stops.
 */
export function useRazorpayCheckout(email: string) {
  const router = useRouter()
  const [message, setMessage] = useState<null | string>(null)
  const [status, setStatus] = useState<Status>('idle')

  const verifyAndContinue = async (response: RazorpayHandlerResponse) => {
    let orderId: number | string | null = null

    try {
      // The server verifies the payment and writes the order here, so this is
      // where the order id comes from. A refusal or a dropped connection leaves
      // the payment to the signed webhook and shows the customer one sentence.
      const answer = await fetch('/api/orders/verify', {
        body: JSON.stringify(response),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      const body = (await answer.json().catch(() => null)) as { orderId?: number | string } | null

      if (
        answer.ok &&
        body &&
        (typeof body.orderId === 'number' || typeof body.orderId === 'string')
      ) {
        orderId = body.orderId
      }
    } catch {
      // The sentence below covers it.
    }

    if (orderId === null) {
      setStatus('idle')
      setMessage(CHECKOUT_CONFIRMING_MESSAGE)
      return
    }

    router.push(`/order-placed/${orderId}`)
  }

  /** Starts payment for delivery details the schema has already accepted. */
  const pay = async (parsed: { data: OrderDelivery }, note: string) => {
    setMessage(null)
    setStatus('starting')

    let created: {
      amount: number
      gatewayOrderId: string
      keyId: string
    } | null = null
    let failure: string = CHECKOUT_FAILED_MESSAGE

    try {
      const answer = await fetch('/api/orders/create', {
        body: JSON.stringify({
          delivery: parsed.data,
          note,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      const body = (await answer.json().catch(() => null)) as { message?: string } | null

      // The server resolves the live price and opens the gateway order. Accept
      // its own shape check so a successful create is never mistaken for a
      // failed one.
      const candidate = answer.ok ? readCreatedOrder(body) : null

      if (candidate) {
        created = candidate
      } else if (body?.message) {
        failure = body.message
      }
    } catch {
      // The failure sentence below covers it.
    }

    if (!created) {
      setStatus('idle')
      setMessage(failure)
      return
    }

    setStatus('paying')

    const openPopup = () => {
      const Razorpay = window.Razorpay

      if (!Razorpay) {
        setStatus('idle')
        setMessage(CHECKOUT_SCRIPT_FAILED_MESSAGE)
        return
      }

      try {
        const checkout = new Razorpay({
          amount: created.amount,
          currency: 'INR',
          description: 'UNAVE meal product',
          handler: (response) => {
            void verifyAndContinue(response)
          },
          key: created.keyId,
          modal: {
            ondismiss: () => {
              setStatus('idle')
              setMessage(CHECKOUT_CLOSED_MESSAGE)
            },
          },
          name: 'UNAVE kitchen',
          order_id: created.gatewayOrderId,
          prefill: { email, name: parsed.data.name, phone: parsed.data.phone },
          theme: { color: '#1a4b36' },
        })

        checkout.open()
      } catch {
        setStatus('idle')
        setMessage(CHECKOUT_SCRIPT_FAILED_MESSAGE)
      }
    }

    // The script tag sits above this component; by submit time it is almost
    // always in. A slow or blocked script gets fifteen seconds, then a sentence
    // that names the likely cause instead of the generic failure.
    if (window.Razorpay) {
      openPopup()
    } else {
      const timer = setInterval(() => {
        if (window.Razorpay) {
          clearInterval(timer)
          openPopup()
        }
      }, 100)
      setTimeout(() => {
        if (!window.Razorpay) {
          clearInterval(timer)
          setStatus('idle')
          setMessage(CHECKOUT_SCRIPT_FAILED_MESSAGE)
        }
      }, 15_000)
    }
  }

  return { busy: status !== 'idle', message, pay }
}
