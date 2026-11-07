import type { CollectionBeforeDeleteHook } from 'payload'

import { APIError } from 'payload'

/**
 * A subcategory that products still use cannot be deleted (spec 0008, AC-9).
 *
 * Payload's relation columns are `ON DELETE set null`, so the database would
 * quietly unassign every product instead of refusing. This hook asks first and
 * tells the kitchen to reassign those products, which keeps every card on a
 * shelf that has a label to filter by.
 */
export const denyDeleteInUse: CollectionBeforeDeleteHook = async ({ id, req: { payload } }) => {
  const inUse = await payload.count({
    collection: 'products',
    overrideAccess: true,
    where: {
      subcategory: {
        equals: id,
      },
    },
  })

  if (inUse.totalDocs > 0) {
    throw new APIError(
      `This subcategory is still used by ${inUse.totalDocs} product${
        inUse.totalDocs === 1 ? '' : 's'
      }. Give those products another subcategory first, then delete this one.`,
      400,
    )
  }
}
