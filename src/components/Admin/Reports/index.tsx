import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { isStaffRequest, loadOrderReport } from '@/collections/Orders/report'
import { isReportPeriod, type ReportPeriod } from '@/utilities/orderReport/range'

import { ReportsBody } from './ReportsBody'
import './index.scss'

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/**
 * /admin/reports — the weekly and monthly orders report. The page previews the
 * same figures the PDF and the spreadsheet carry, so staff can check a period
 * before downloading it.
 */
const ReportsView = async ({ initPageResult, params, searchParams }: AdminViewServerProps) => {
  const { req } = initPageResult
  const periodParam = first(searchParams?.period)
  const period: ReportPeriod = isReportPeriod(periodParam) ? periodParam : 'week'
  const key = first(searchParams?.key)

  const content = isStaffRequest(req) ? (
    <ReportsBody period={period} report={await loadOrderReport(req, period, key)} />
  ) : (
    <p>Only staff can see reports.</p>
  )

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={req.user || undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter className="unave-rpt">{content}</Gutter>
    </DefaultTemplate>
  )
}

export default ReportsView
