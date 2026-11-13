import type { TaskConfig } from 'payload'

import { fetchRazorpayOrder } from '@/utilities/razorpay'

const RETENTION_DAYS = 30
const BATCH_SIZE = 500

type CleanupInput = Record<string, never>
type CleanupOutput = { deleted: number; retained: number }

export const cleanupCheckoutIntentsTask: TaskConfig<{
  input: CleanupInput
  output: CleanupOutput
}> = {
  slug: 'cleanupCheckoutIntents',
  label: 'Clean up expired checkout intents',
  schedule: [{ cron: '0 4 * * *', queue: 'default' }],
  handler: async ({ req }) => {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const found = await req.payload.find({
      collection: 'checkout-intents',
      depth: 0,
      limit: BATCH_SIZE,
      overrideAccess: true,
      where: { expiresAt: { less_than_equal: cutoff } },
    })
    let deleted = 0
    let retained = 0

    for (const intent of found.docs) {
      const gatewayOrderId = intent.gatewayOrderId
      let gatewayOrder

      try {
        gatewayOrder = await fetchRazorpayOrder(gatewayOrderId)
      } catch (error) {
        req.payload.logger.warn({
          err: error instanceof Error ? error.message : String(error),
          gatewayOrderId,
          msg: 'checkout_intent_cleanup_lookup_failed',
        })
        retained += 1
        continue
      }

      if (
        gatewayOrder.amount_paid !== 0 ||
        (gatewayOrder.status !== 'created' && gatewayOrder.status !== 'attempted')
      ) {
        req.payload.logger.warn({
          amountPaid: gatewayOrder.amount_paid,
          gatewayOrderId,
          msg: 'checkout_intent_cleanup_retained',
          status: gatewayOrder.status,
        })
        retained += 1
        continue
      }

      try {
        await req.payload.delete({
          collection: 'checkout-intents',
          id: intent.id,
          overrideAccess: true,
        })
        deleted += 1
      } catch (error) {
        req.payload.logger.error({
          err: error instanceof Error ? error.message : String(error),
          gatewayOrderId,
          msg: 'checkout_intent_cleanup_delete_failed',
        })
        retained += 1
      }
    }

    return { output: { deleted, retained } }
  },
}
