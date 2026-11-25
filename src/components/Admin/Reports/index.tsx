import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { Link } from '@payloadcms/ui/elements/Link'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { isStaffRequest, loadOrderReport } from '@/collections/Orders/report'
import { formatPaise } from '@/utilities/money'
import { changeText } from '@/utilities/orderReport/build'
import { isReportPeriod, reportRange, shiftRange, type ReportPeriod } from '@/utilities/orderReport/range'

import './index.scss'

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

const viewHref = (period: ReportPeriod, key?: string) =>
  `/admin/reports?period=${period}${key ? `&key=${encodeURIComponent(key)}` : ''}`

const downloadHref = (period: ReportPeriod, key: string, format: 'pdf' | 'xlsx') =>
  `/api/orders/report?period=${period}&key=${encodeURIComponent(key)}&format=${format}`

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

  const template = (children: React.ReactNode) => (
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
      <Gutter className="unave-reports">{children}</Gutter>
    </DefaultTemplate>
  )

  if (!isStaffRequest(req)) {
    return template(<p>Only staff can see reports.</p>)
  }

  const report = await loadOrderReport(req, period, key)
  const { range, totals } = report
  const previous = shiftRange(range, -1)
  const next = shiftRange(range, 1)
  const current = reportRange(period)
  const isCurrent = range.key === current.key
  const nextIsFuture = next.from.getTime() > current.from.getTime()
  const noun = period === 'week' ? 'week' : 'month'
  const change = changeText(report)
  const busiest = Math.max(1, ...report.days.map((day) => day.revenue))

  const figures: [string, string][] = [
    ['Revenue', formatPaise(totals.revenue)],
    ['Paid orders', String(totals.orders)],
    ['Average order', formatPaise(totals.average)],
    ['Customers', String(totals.customers)],
    ['Items sold', String(totals.items)],
    ['Net after Razorpay fees', formatPaise(totals.net)],
  ]

  return template(
    <>
      <header className="unave-reports__header">
        <div>
          <Link className="unave-reports__back" href="/admin/collections/orders">
            ← Orders
          </Link>
          <h1 className="unave-reports__title">Order reports</h1>
          <p className="unave-reports__meta">
            Paid orders by the day they were paid, in Indian time. Weeks run Monday to Sunday.
          </p>
        </div>
        <nav aria-label="Report period" className="unave-reports__tabs">
          {(['week', 'month'] as const).map((option) => (
            <Link
              aria-current={option === period ? 'page' : undefined}
              className="unave-reports__tab"
              href={viewHref(option)}
              key={option}
            >
              {option === 'week' ? 'Weekly' : 'Monthly'}
            </Link>
          ))}
        </nav>
      </header>

      <section aria-label="Choose a period" className="unave-reports__bar">
        <div className="unave-reports__stepper">
          <Link
            aria-label={`Previous ${noun}: ${previous.label}`}
            className="unave-reports__step"
            href={viewHref(period, previous.key)}
          >
            ‹
          </Link>
          <h2 className="unave-reports__range">{range.label}</h2>
          {nextIsFuture ? (
            <span aria-hidden="true" className="unave-reports__step unave-reports__step--off">
              ›
            </span>
          ) : (
            <Link
              aria-label={`Next ${noun}: ${next.label}`}
              className="unave-reports__step"
              href={viewHref(period, next.key)}
            >
              ›
            </Link>
          )}
          {!isCurrent && (
            <Link className="unave-reports__today" href={viewHref(period)}>
              This {noun}
            </Link>
          )}
        </div>
        <div className="unave-reports__downloads">
          <a
            className="btn btn--style-primary btn--size-medium unave-reports__download"
            download
            href={downloadHref(period, range.key, 'pdf')}
          >
            Download PDF
          </a>
          <a
            className="btn btn--style-secondary btn--size-medium unave-reports__download"
            download
            href={downloadHref(period, range.key, 'xlsx')}
          >
            Download Excel
          </a>
        </div>
      </section>

      <dl className="unave-reports__figures">
        {figures.map(([label, value]) => (
          <div className="card unave-reports__figure" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {change && <p className="unave-reports__change">{change}</p>}

      <div className="unave-reports__grid">
        <section className="unave-reports__panel">
          <h3>Day by day</h3>
          <table className="unave-reports__table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th className="is-num" scope="col">
                  Orders
                </th>
                <th className="is-num" scope="col">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {report.days.map((day) => (
                <tr key={day.label}>
                  <th scope="row">{day.label}</th>
                  <td className="is-num">{day.orders}</td>
                  <td className="is-num unave-reports__barcell">
                    <span
                      aria-hidden="true"
                      className="unave-reports__bar-fill"
                      style={{ width: `${(day.revenue / busiest) * 100}%` }}
                    />
                    <span className="unave-reports__bar-value">{formatPaise(day.revenue)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td className="is-num">{totals.orders}</td>
                <td className="is-num">{formatPaise(totals.revenue)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <div className="unave-reports__side">
          <section className="unave-reports__panel">
            <h3>Products</h3>
            {report.products.length ? (
              <table className="unave-reports__table">
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th className="is-num" scope="col">
                      Qty
                    </th>
                    <th className="is-num" scope="col">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.products.map((product) => (
                    <tr key={`${product.title}-${product.duration}`}>
                      <th scope="row">
                        {product.title}
                        {product.duration && (
                          <span className="unave-reports__muted"> · {product.duration}</span>
                        )}
                      </th>
                      <td className="is-num">{product.qty}</td>
                      <td className="is-num">{formatPaise(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="unave-reports__muted">No products sold this {noun}.</p>
            )}
          </section>

          {report.methods.length > 0 && (
            <section className="unave-reports__panel">
              <h3>Payment methods</h3>
              <table className="unave-reports__table">
                <tbody>
                  {report.methods.map((method) => (
                    <tr key={method.method}>
                      <th scope="row">{method.method}</th>
                      <td className="is-num">{method.orders}</td>
                      <td className="is-num">{formatPaise(method.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>

      <p className="unave-reports__muted unave-reports__footnote">
        The downloads also list every order with the customer, items and Razorpay payment id.
      </p>
    </>,
  )
}

export default ReportsView
