import type { GlobalAfterChangeHook } from 'payload'

import { revalidateTag } from 'next/cache'

export const revalidateDeliveryAreas: GlobalAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating delivery areas`)

    /* Outside a Next request context (scripts, the local API) revalidateTag throws;
       losing the cache invalidation there is harmless, so the write never fails on it. */
    try {
      revalidateTag('global_delivery-areas', 'max')
    } catch {
      payload.logger.warn(`Could not revalidate the delivery areas cache outside a Next request context`)
    }
  }

  return doc
}
