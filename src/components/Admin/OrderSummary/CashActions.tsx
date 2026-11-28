'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

/**
 * Mark cash collected, or cancel, on a cash on delivery order that is still
 * waiting for its cash (spec 2026-11-28). Each asks first; the server allows
 * each change once, so a second click or a stale tab gets a plain answer.
 */
export function CashActions({ orderId, total }: { orderId: number | string; total: string }): React.JSX.Element {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const act = async (action: 'cancel' | 'collect') => {
    const question =
      action === 'collect'
        ? `Mark ${total} in cash as collected for order #${orderId}? This counts it as revenue today.`
        : `Cancel order #${orderId}? The customer will no longer owe ${total}.`
    if (!window.confirm(question)) return

    setBusy(true)
    try {
      const response = await fetch(`/api/orders/${orderId}/${action}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const body = (await response.json().catch(() => null)) as { message?: string } | null

      if (response.ok) {
        toast.success(action === 'collect' ? 'Cash marked as collected.' : 'Order cancelled.')
        router.refresh()
      } else {
        toast.error(body?.message ?? 'That did not work. Reload the page and try again.')
      }
    } catch {
      toast.error('That did not work. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="order-payment__actions">
      <Button buttonStyle="primary" disabled={busy} onClick={() => void act('collect')} size="medium">
        Mark cash collected
      </Button>
      <Button buttonStyle="secondary" disabled={busy} onClick={() => void act('cancel')} size="medium">
        Cancel order
      </Button>
    </div>
  )
}
