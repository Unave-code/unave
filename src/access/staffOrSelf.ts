import type { Access } from 'payload'

import { hasAdminRole } from './isAdmin'
import { hasStaffRole } from './isStaff'

type SelfHolder = { collection?: string; id: number | string }

/**
 * Only the user's own record, and only in their own collection. Customers and
 * staff users are numbered separately, so customer 3 and user 3 share an id; the
 * collection check keeps one from reaching the other.
 */
const selfIn = (collection: string, user: unknown) => {
  const holder = user as null | SelfHolder
  if (!holder || holder.collection !== collection) return false
  return { id: { equals: holder.id } }
}

/** Staff see every record; anyone else only their own in this collection. */
export const staffOrSelf =
  (collection: string): Access =>
  ({ req: { user } }) =>
    hasStaffRole(user) ? true : selfIn(collection, user)

/** Admins change any record; anyone else, staff included, only their own in this collection. */
export const adminOrSelf =
  (collection: string): Access =>
  ({ req: { user } }) =>
    hasAdminRole(user) ? true : selfIn(collection, user)
