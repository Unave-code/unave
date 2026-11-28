'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import type { z } from 'zod'

import type { orderDeliverySchema } from '@/collections/Orders/schema'
import { CART_EVENT } from '@/utilities/cart'
import { readCashOrder } from '@/utilities/cashCheckout'

import { CHECKOUT_CASH_FAILED_MESSAGE } from './copy'

type OrderDelivery = z.infer<typeof orderDeliverySchema>

/**
 * The cash on delivery half of checkout (spec 2026-11-28): post the delivery
 * details to `/api/orders/cash` and walk to the order page. One key per visit
 * rides every attempt, so a double click or a retry after a dropped reply finds
 * the order already placed instead of placing a second.
 */
export function useCashCheckout() {
  const router = useRouter()
  const key = useRef<null | string>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<null | string>(null)
  const [pincodeRefused, setPincodeRefused] = useState(false)

  const placeOrder = async (parsed: { data: OrderDelivery }, note: string) => {
    if (busy) return

    key.current ??= crypto.randomUUID()
    setBusy(true)
    setMessage(null)
    setPincodeRefused(false)

    let failure = CHECKOUT_CASH_FAILED_MESSAGE

    try {
      const answer = await fetch('/api/orders/cash', {
        body: JSON.stringify({ cashKey: key.current, delivery: parsed.data, note }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const body = (await answer.json().catch(() => null)) as { message?: string; reason?: string } | null

      if (body?.reason === 'pincode-not-served') {
        setBusy(false)
        setPincodeRefused(true)
        return
      }

      const placed = answer.ok ? readCashOrder(body) : null

      if (placed) {
        // The reply cleared the cart cookie; tell the header badge.
        window.dispatchEvent(new Event(CART_EVENT))
        // Busy stays on: the page is leaving.
        router.push(`/order-placed/${placed.orderId}`)
        return
      }

      if (body?.message) failure = body.message
    } catch {
      // The failure sentence covers it.
    }

    setBusy(false)
    setMessage(failure)
  }

  return {
    busy,
    clearPincodeRefused: () => setPincodeRefused(false),
    message,
    pincodeRefused,
    placeOrder,
  }
}
