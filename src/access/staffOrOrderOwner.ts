import type { Access } from 'payload'

import { hasStaffRole } from './isStaff'

type OrderReader = { collection?: string; id?: number | string }

/**
 * Orders are read by the kitchen and by the one customer who owns the row.
 *
 * `req.user` is a customer only when the `unave-customer` session verified, so
 * an anonymous caller and a caller with somebody else's id both fall through to
 * `false`. Staff see every row.
 *
 * Customers and staff users are numbered separately, so customer 3 and user 3
 * share an id. The collection check keeps a `users` account that is not staff
 * from matching a customer's orders by id.
 */
export const staffOrOrderOwner: Access = ({ req: { user } }) => {
  if (hasStaffRole(user)) return true

  const reader = user as null | OrderReader | undefined

  if (!reader || reader.collection !== 'customers' || typeof reader.id === 'undefined') return false

  return {
    customer: {
      equals: reader.id,
    },
  }
}
