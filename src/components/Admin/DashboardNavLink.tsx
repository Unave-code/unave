'use client'

import { Link } from '@payloadcms/ui/elements/Link'
import { useConfig } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import React from 'react'

/**
 * A "Dashboard" row at the top of the admin sidebar, above the groups.
 * It copies the markup Payload uses for its own nav links: a `nav__link`, the
 * active indicator, and plain text instead of a link while the dashboard is
 * already open. That way it picks up the sidebar's own styles.
 */
const DashboardNavLink: React.FC = () => {
  const pathname = usePathname()
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig()

  const href = adminRoute || '/admin'
  const isActive = pathname === href || pathname === `${href}/`

  const label = (
    <>
      {isActive && <div className="nav__link-indicator" />}
      <span className="nav__link-label">Dashboard</span>
    </>
  )

  return (
    <div className="unave-nav-dashboard">
      {isActive ? (
        <div aria-current="page" className="nav__link" id="nav-dashboard">
          {label}
        </div>
      ) : (
        <Link className="nav__link" href={href} id="nav-dashboard" prefetch={false}>
          {label}
        </Link>
      )}
    </div>
  )
}

export default DashboardNavLink
