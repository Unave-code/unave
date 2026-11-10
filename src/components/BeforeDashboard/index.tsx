import { Link } from '@payloadcms/ui/elements/Link'
import React from 'react'

import { PaymentModeNotice } from '@/components/Admin/PaymentModeNotice'

import './index.scss'

const baseClass = 'before-dashboard'

/**
 * The opening block of the admin dashboard: a short welcome and the four desks
 * staff walk to most. The live numbers sit below in the dashboard widgets.
 */
const DESKS = [
  { href: '/admin/collections/orders', label: 'Orders' },
  { href: '/admin/collections/enquiries', label: 'Enquiries' },
  { href: '/admin/collections/products', label: 'Products' },
  { href: '/admin/collections/customers', label: 'Customers' },
]

const BeforeDashboard: React.FC = () => {
  return (
    <div className={baseClass}>
      <PaymentModeNotice />
      <p className={`${baseClass}__eyebrow`}>UNAVE</p>
      <h2 className={`${baseClass}__title`}>The kitchen desk</h2>
      <p className={`${baseClass}__lede`}>
        Orders, messages and the catalogue — everything the counter needs, in one place.
      </p>
      <nav className={`${baseClass}__desks`}>
        {DESKS.map((desk) => (
          <Link className={`${baseClass}__desk`} href={desk.href} key={desk.href}>
            {desk.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

export default BeforeDashboard
