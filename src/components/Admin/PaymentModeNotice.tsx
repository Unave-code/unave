import { Banner } from '@payloadcms/ui/elements/Banner'
import React from 'react'

import { razorpayMode } from '@/utilities/razorpay'

/**
 * The Razorpay mode, shown to staff (spec 0007, AC-13).
 *
 * A test key pointed at a live dashboard is visible here before it costs
 * money. Read only by nature (it comes from the key id's prefix, the same
 * source the create endpoint logs from), so it needs no field and no write.
 * It renders in the order view as a `ui` field and again on the dashboard.
 */
export const PaymentModeNotice: React.FC = () => {
  const mode = razorpayMode()

  if (mode === 'live') {
    return (
      <Banner type="success">
        <strong>Online payment mode: live.</strong> Customers are charged for real.
      </Banner>
    )
  }

  if (mode === 'test') {
    return (
      <Banner type="warning">
        <strong>Online payment mode: test.</strong> No real money moves. Swap in the live keys
        before the kitchen takes live orders.
      </Banner>
    )
  }

  return (
    <Banner type="warning">
      <strong>Online payment mode: not configured.</strong> The pay action reports a plain
      configuration error until the Razorpay keys are set.
    </Banner>
  )
}
