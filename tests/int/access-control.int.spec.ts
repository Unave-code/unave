import { describe, expect, it } from 'vitest'

import { hasAdminRole, isAdmin, isAdminField } from '@/access/isAdmin'
import { hasStaffRole, isStaff } from '@/access/isStaff'
import { staffOrPublished } from '@/access/staffOrPublished'
import { staffOrOrderOwner } from '@/access/staffOrOrderOwner'
import { adminOrSelf, staffOrSelf } from '@/access/staffOrSelf'
import { safeReturnPath } from '@/utilities/formPost'

const args = (user: unknown) => ({ req: { user } }) as any

const admin = { id: 1, role: 'admin' }
const staff = { id: 2, role: 'staff' }
const plainUser = { id: 3, role: undefined }
const customer = { id: 4, role: 'customer' }

describe('hasStaffRole', () => {
  it('accepts admins and staff', () => {
    expect(hasStaffRole(admin)).toBe(true)
    expect(hasStaffRole(staff)).toBe(true)
  })

  it('rejects anonymous visitors', () => {
    expect(hasStaffRole(null)).toBe(false)
    expect(hasStaffRole(undefined)).toBe(false)
  })

  it('rejects a user with an unknown role', () => {
    expect(hasStaffRole(customer)).toBe(false)
    expect(hasStaffRole({})).toBe(false)
  })
})

describe('isStaff', () => {
  it('allows a staff token to reach staff collections', () => {
    expect(isStaff(args(staff))).toBe(true)
    expect(isStaff(args(admin))).toBe(true)
  })

  it('refuses an anonymous request', () => {
    expect(isStaff(args(null))).toBe(false)
  })
})

describe('isAdmin', () => {
  it('allows only the admin role', () => {
    expect(isAdmin(args(admin))).toBe(true)
    expect(isAdmin(args(staff))).toBe(false)
    expect(isAdmin(args(null))).toBe(false)
  })
})

describe('isAdminField', () => {
  it('allows only an admin to write an admin guarded field such as role', () => {
    expect(isAdminField(args(admin))).toBe(true)
    expect(isAdminField(args(staff))).toBe(false)
    expect(isAdminField(args(null))).toBe(false)
  })
})

describe('staffOrPublished', () => {
  it('lets staff read every document, drafts included', () => {
    expect(staffOrPublished(args(admin))).toBe(true)
    expect(staffOrPublished(args(staff))).toBe(true)
  })

  it('restricts a signed in customer to published documents', () => {
    expect(staffOrPublished(args(customer))).toEqual({ _status: { equals: 'published' } })
    expect(staffOrPublished(args(plainUser))).toEqual({ _status: { equals: 'published' } })
  })

  it('restricts an anonymous visitor to published documents', () => {
    expect(staffOrPublished(args(null))).toEqual({ _status: { equals: 'published' } })
    expect(staffOrPublished(args(undefined))).toEqual({ _status: { equals: 'published' } })
  })

  it('never grants a customer write shaped access to the CMS', () => {
    // The four content collections gate create, update and delete on isStaff, so a
    // customer reaching them must be false, not a query.
    expect(isStaff(args(customer))).toBe(false)
    expect(isStaff(args(plainUser))).toBe(false)
  })
})

describe('hasAdminRole', () => {
  it('accepts only the admin role', () => {
    expect(hasAdminRole(admin)).toBe(true)
    expect(hasAdminRole(staff)).toBe(false)
    expect(hasAdminRole(customer)).toBe(false)
    expect(hasAdminRole(null)).toBe(false)
  })
})

describe('staffOrSelf', () => {
  const users = staffOrSelf('users')

  it('refuses an anonymous request', () => {
    expect(users(args(null))).toBe(false)
  })

  it('lets admins and staff reach every user record', () => {
    expect(users(args(admin))).toBe(true)
    expect(users(args(staff))).toBe(true)
  })

  it('limits a signed in user without a staff role to their own record', () => {
    expect(users(args({ ...plainUser, collection: 'users' }))).toEqual({ id: { equals: 3 } })
  })

  it('never lets a customer reach the staff user that shares its id', () => {
    expect(users(args({ id: 1, collection: 'customers' }))).toBe(false)
    expect(users(args({ id: 1, collection: 'customers', role: 'admin' }))).toBe(false)
  })

  it('limits a customer to their own customer record', () => {
    expect(staffOrSelf('customers')(args({ id: 4, collection: 'customers' }))).toEqual({ id: { equals: 4 } })
  })
})

describe('adminOrSelf', () => {
  const users = adminOrSelf('users')

  it('lets an admin change any user', () => {
    expect(users(args({ ...admin, collection: 'users' }))).toBe(true)
  })

  it('limits staff to their own account', () => {
    expect(users(args({ ...staff, collection: 'users' }))).toEqual({ id: { equals: 2 } })
  })

  it('never lets a customer change a staff account', () => {
    expect(users(args({ id: 1, collection: 'customers' }))).toBe(false)
  })
})

describe('a customer session is never staff', () => {
  it('ignores any role on a customer document', () => {
    expect(hasStaffRole({ collection: 'customers', role: 'admin' })).toBe(false)
    expect(hasAdminRole({ collection: 'customers', role: 'admin' })).toBe(false)
  })
})

describe('safeReturnPath', () => {
  it('keeps a plain path on this site', () => {
    expect(safeReturnPath('/checkout')).toBe('/checkout')
  })

  it('refuses a path a browser would turn into another site', () => {
    expect(safeReturnPath('//evil.com')).toBeNull()
    expect(safeReturnPath('/' + String.fromCharCode(9) + '/evil.com')).toBeNull()
    expect(safeReturnPath('/' + String.fromCharCode(10) + '/evil.com')).toBeNull()
  })
})

describe('staffOrOrderOwner', () => {
  it('lets admins and staff read every order', () => {
    expect(staffOrOrderOwner(args({ ...admin, collection: 'users' }))).toBe(true)
    expect(staffOrOrderOwner(args({ ...staff, collection: 'users' }))).toBe(true)
  })

  it('limits a signed in customer to their own orders', () => {
    expect(staffOrOrderOwner(args({ collection: 'customers', id: 3 }))).toEqual({
      customer: { equals: 3 },
    })
  })

  it('never matches a staff users account to a customer with the same id', () => {
    expect(staffOrOrderOwner(args({ collection: 'users', id: 3, role: undefined }))).toBe(false)
  })

  it('refuses an anonymous request', () => {
    expect(staffOrOrderOwner(args(null))).toBe(false)
    expect(staffOrOrderOwner(args(undefined))).toBe(false)
  })
})
