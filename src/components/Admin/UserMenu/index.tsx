'use client'

// Everything must come from the package root: the root barrel inlines its own
// copies of the providers, so subpath imports like
// `@payloadcms/ui/providers/Config` hold different context objects than the
// ones the admin actually mounts — useConfig returns undefined there.
import { Link, Popup, useAuth, useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import './index.scss'

const baseClass = 'unave-user-menu'

/**
 * The client-side user object is slimmer than the server one — no role or
 * timestamps — so the menu types it structurally and shows name and email.
 */
type MenuUser = {
  email?: string
  name?: string | null
}

const initialsOf = (user: MenuUser): string => {
  const name = typeof user?.name === 'string' ? user.name.trim() : ''

  if (name.length > 0) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
  }

  return user?.email?.charAt(0).toUpperCase() ?? '?'
}

/**
 * The staff member's chip in the admin header's top-right corner, rendered in
 * the `admin.avatar` slot, with a menu that reaches the account page and sign
 * out. Payload's stock control here is a bare avatar with no menu, so this
 * takes the slot instead.
 *
 * The avatar slot sits inside Payload's account link, and the popup trigger
 * is a div that bubbles clicks up to it — the capture guard below swallows
 * that default navigation, so a click opens the menu rather than leaving the
 * page. The menu itself renders in a portal, outside the link, and its items
 * navigate normally.
 */
export const UserMenu: React.FC = () => {
  const { user } = useAuth()
  const { config } = useConfig()

  if (!user) return null

  const accountRoute = formatAdminURL({ adminRoute: config.routes.admin, path: config.admin.routes.account })
  const logoutRoute = formatAdminURL({ adminRoute: config.routes.admin, path: config.admin.routes.logout })

  return (
    <div className={baseClass} onClickCapture={(event) => event.preventDefault()}>
      <Popup
        button={
          <span className={`${baseClass}__chip`}>
            <span className={`${baseClass}__initials`}>{initialsOf(user)}</span>
            <span className={`${baseClass}__name`}>{user.name || user.email}</span>
          </span>
        }
        buttonType="custom"
        className={`${baseClass}__popup`}
        horizontalAlign="right"
        render={({ close }) => (
          <div className={`${baseClass}__content`}>
            <div className={`${baseClass}__identity`}>
              <p className={`${baseClass}__heading`}>{user.name || 'Staff'}</p>
              <p className={`${baseClass}__subheading`}>{user.email}</p>
            </div>
            <Link className={`${baseClass}__item`} href={accountRoute} onClick={close}>
              Account
            </Link>
            <Link className={`${baseClass}__item`} href={logoutRoute} onClick={close}>
              Sign out
            </Link>
          </div>
        )}
        size="small"
        verticalAlign="bottom"
      />
    </div>
  )
}

export default UserMenu
