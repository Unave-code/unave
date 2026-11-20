import type { GlobalAfterChangeHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

export const revalidatePlanBuilder: GlobalAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) {
    payload.logger.info('Revalidating plan builder')
    revalidateTag('global_plan-builder', 'max')
    revalidatePath('/meal-subscription')
  }

  return doc
}
