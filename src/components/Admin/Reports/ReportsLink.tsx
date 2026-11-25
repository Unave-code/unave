import { Link } from '@payloadcms/ui/elements/Link'
import { ChartColumn } from 'lucide-react'
import React from 'react'

import './index.scss'

/** Above the orders list: the way into the weekly and monthly reports. */
const ReportsLink: React.FC = () => (
  <div className="unave-reports-link">
    <p className="unave-reports-link__text">
      <strong>Sales reports</strong>
      <span>Weekly and monthly figures, ready to download as PDF or Excel.</span>
    </p>
    <Link className="unave-reports-link__button" href="/admin/reports">
      <ChartColumn aria-hidden size={18} />
      Open reports
    </Link>
  </div>
)

export default ReportsLink
