import type { GlobalAfterChangeHook } from 'payload'

import { revalidateTag } from 'next/cache'

export const revalidateHero: GlobalAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating hero`)

    /* revalidateTag needs a Next request context. The admin runs inside one, but a
       script or a console calling the local API does not — losing the cache
       invalidation there is harmless, so the write itself is never failed by it. */
    try {
      revalidateTag('global_hero', 'max')
    } catch {
      payload.logger.warn(`Could not revalidate the hero cache outside a Next request context`)
    }
  }

  return doc
}
