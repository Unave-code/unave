import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Audience, Product } from '@/payload-types'

/**
 * Audiences are a list staff keep in the admin (Catalogue → Audiences), so
 * their names are read from the database rather than written in code.
 */

/** The name of a product's audience, when it is populated. */
export const audienceTitle = (audience: Product['audience']): null | string =>
  audience && typeof audience === 'object' ? audience.title : null

/** Every audience, in the order staff set, for the products filter. */
export const fetchAudiences = async (): Promise<Audience[]> => {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'audiences',
    depth: 0,
    limit: 100,
    pagination: false,
    sort: ['position', 'title'],
  })

  return result.docs
}
