import { Link } from '@payloadcms/ui/elements/Link'
import React from 'react'

import './index.scss'

/** Above the orders list: the way into the weekly and monthly reports. */
const ReportsLink: React.FC = () => (
  <div className="unave-reports-link">
    <p className="unave-reports-link__text">Weekly and monthly sales, ready to download as PDF or Excel.</p>
    <Link className="btn btn--style-secondary btn--size-small unave-reports-link__button" href="/admin/reports">
      Open reports
    </Link>
  </div>
)

export default ReportsLink
