import type { Access } from 'payload'

type RoleHolder = { collection?: string; role?: string | null }

/**
 * Whether the signed in user is staff (admin or staff role). A customer session
 * is a signed in user too, so a customer never counts, whatever its document holds.
 */
export const hasStaffRole = (user: unknown): boolean => {
  const holder = user as null | RoleHolder
  if (!holder || holder.collection === 'customers') return false
  return holder.role === 'admin' || holder.role === 'staff'
}

export const isStaff: Access = ({ req: { user } }) => hasStaffRole(user)
