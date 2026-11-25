import { Link } from '@payloadcms/ui/elements/Link'
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Minus,
} from 'lucide-react'
import React from 'react'

import { formatPaise } from '@/utilities/money'
import type { OrderReport } from '@/utilities/orderReport/build'
import {
  istFormat,
  periodAdjective,
  REPORT_PERIODS,
  reportRange,
  shiftRange,
  type ReportPeriod,
} from '@/utilities/orderReport/range'

/** Orders shown per page in the table; the downloads always carry every order. */
export const ORDERS_PER_PAGE = 25

const viewHref = (period: ReportPeriod, key?: string, page?: number) =>
  `/admin/reports?period=${period}${key ? `&key=${encodeURIComponent(key)}` : ''}${
    page ? `${page > 1 ? `&page=${page}` : ''}#orders` : ''
  }`

const downloadHref = (period: ReportPeriod, key: string, format: 'pdf' | 'xlsx') =>
  `/api/orders/report?period=${period}&key=${encodeURIComponent(key)}&format=${format}`

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

/** The revenue change against the period before, as a coloured badge. */
const Change: React.FC<{ report: OrderReport; noun: string }> = ({ noun, report }) => {
  const before = report.previous?.revenue ?? 0
  const now = report.totals.revenue

  if (!report.previous) return null
  if (before <= 0) {
    return <span className="unave-rpt__badge">No sales the previous {noun}</span>
  }

  const pct = Math.round(((now - before) / before) * 100)
  const tone = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus

  return (
    <span className={`unave-rpt__badge unave-rpt__badge--${tone}`}>
      <Icon aria-hidden size={14} strokeWidth={2.5} />
      {pct === 0 ? 'Level' : `${Math.abs(pct)}%`} vs previous {noun}
      <span className="unave-rpt__badge-sub">{formatPaise(before)}</span>
    </span>
  )
}

/** Share of revenue as a thin bar under a row. */
const Share: React.FC<{ value: number }> = ({ value }) => (
  <span aria-hidden className="unave-rpt__share">
    <span className="unave-rpt__share-fill" style={{ width: `${Math.max(value, 2)}%` }} />
  </span>
)

/** Page numbers to show: the first, the last, and two either side of the current one. */
export const pageList = (current: number, count: number): (number | 'gap')[] => {
  const pages: (number | 'gap')[] = []
  for (let n = 1; n <= count; n += 1) {
    if (n === 1 || n === count || Math.abs(n - current) <= 1) pages.push(n)
    else if (pages[pages.length - 1] !== 'gap') pages.push('gap')
  }
  return pages
}

/** The report page's content, without the admin chrome around it. */
export const ReportsBody: React.FC<{ report: OrderReport; period: ReportPeriod; page?: number }> = ({
  page: requestedPage = 1,
  period,
  report,
}) => {
  const { range, totals } = report
  const previous = shiftRange(range, -1)
  const next = shiftRange(range, 1)
  const current = reportRange(period)
  const isCurrent = range.key === current.key
  const nextIsFuture = next.from.getTime() > current.from.getTime()
  const noun = period
  const hourly = period === 'day'
  const currentLabel = hourly ? 'Today' : `This ${noun}`
  const pageCount = Math.max(1, Math.ceil(report.rows.length / ORDERS_PER_PAGE))
  const page = Math.min(Math.max(1, Math.floor(requestedPage) || 1), pageCount)
  const firstIndex = (page - 1) * ORDERS_PER_PAGE
  const pageRows = report.rows.slice(firstIndex, firstIndex + ORDERS_PER_PAGE)
  const busiest = Math.max(1, ...report.days.map((day) => day.revenue))
  const best = report.days.reduce((top, day) => (day.revenue > top.revenue ? day : top), report.days[0])
  const empty = totals.orders === 0

  const stats: [string, string][] = [
    ['Paid orders', String(totals.orders)],
    ['Average order', formatPaise(totals.average)],
    ['Customers', String(totals.customers)],
    ['Items sold', String(totals.items)],
    ['Razorpay fees', formatPaise(totals.fees)],
    ['Net after fees', formatPaise(totals.net)],
  ]

  return (
    <>
      <Link className="unave-rpt__back" href="/admin/collections/orders">
        <ArrowLeft aria-hidden size={16} />
        Orders
      </Link>

      <header className="unave-rpt__head">
        <div>
          <p className="unave-rpt__eyebrow">Reports</p>
          <h1 className="unave-rpt__title">Sales and orders</h1>
          <p className="unave-rpt__lede">
            Paid orders, counted on the day they were paid in Indian time. Weeks run Monday to Sunday.
          </p>
        </div>
        <nav aria-label="Report length" className="unave-rpt__seg">
          {REPORT_PERIODS.map((option) => (
            <Link
              aria-current={option === period ? 'page' : undefined}
              className="unave-rpt__seg-item"
              href={viewHref(option)}
              key={option}
            >
              {periodAdjective(option)}
            </Link>
          ))}
        </nav>
      </header>

      <section aria-label="Period and downloads" className="unave-rpt__toolbar">
        <div className="unave-rpt__period">
          <Link
            aria-label={`Previous ${noun}, ${previous.label}`}
            className="unave-rpt__icon-btn"
            href={viewHref(period, previous.key)}
          >
            <ChevronLeft aria-hidden size={20} />
          </Link>
          <div className="unave-rpt__period-text">
            <span className="unave-rpt__period-kind">{isCurrent ? currentLabel : hourly ? 'Day' : period === 'week' ? 'Week' : 'Month'}</span>
            <h2 className="unave-rpt__period-label">{range.label}</h2>
          </div>
          {nextIsFuture ? (
            <span aria-disabled="true" className="unave-rpt__icon-btn is-disabled">
              <ChevronRight aria-hidden size={20} />
            </span>
          ) : (
            <Link
              aria-label={`Next ${noun}, ${next.label}`}
              className="unave-rpt__icon-btn"
              href={viewHref(period, next.key)}
            >
              <ChevronRight aria-hidden size={20} />
            </Link>
          )}
          {!isCurrent && (
            <Link className="unave-rpt__text-btn" href={viewHref(period)}>
              Back to {hourly ? 'today' : `this ${noun}`}
            </Link>
          )}
        </div>
        <div className="unave-rpt__downloads">
          <a className="unave-rpt__pill unave-rpt__pill--primary" download href={downloadHref(period, range.key, 'pdf')}>
            <FileText aria-hidden size={18} />
            Download PDF
          </a>
          <a className="unave-rpt__pill" download href={downloadHref(period, range.key, 'xlsx')}>
            <FileSpreadsheet aria-hidden size={18} />
            Download Excel
          </a>
        </div>
      </section>

      <section aria-label="Summary" className="unave-rpt__summary">
        <div className="unave-rpt__card unave-rpt__hero">
          <p className="unave-rpt__label">Revenue</p>
          <p className="unave-rpt__hero-figure">{formatPaise(totals.revenue)}</p>
          <Change noun={noun} report={report} />
        </div>
        <dl className="unave-rpt__stats">
          {stats.map(([label, value]) => (
            <div className="unave-rpt__card unave-rpt__stat" key={label}>
              <dt className="unave-rpt__label">{label}</dt>
              <dd className="unave-rpt__stat-figure">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {empty ? (
        <div className="unave-rpt__card unave-rpt__empty">
          <h3>No paid orders {hourly ? 'on this day' : `this ${noun}`}</h3>
          <p>
            Step back to an earlier {noun}, or switch to the {period === 'month' ? 'weekly' : 'monthly'} view.
          </p>
        </div>
      ) : (
        <>
          <section className="unave-rpt__card unave-rpt__chart-card">
            <div className="unave-rpt__card-head">
              <h3>{hourly ? 'Hour by hour' : 'Day by day'}</h3>
              {best && best.revenue > 0 && (
                <p className="unave-rpt__muted">
                  {hourly ? 'Busiest hour' : 'Best day'} {best.label}, {formatPaise(best.revenue)}
                </p>
              )}
            </div>
            <ol
              aria-label={hourly ? 'Revenue per hour' : 'Revenue per day'}
              className={`unave-rpt__chart unave-rpt__chart--${period}`}
              style={{ gridTemplateColumns: `repeat(${report.days.length}, minmax(0, 1fr))` }}
            >
              {report.days.map((day, index) => {
                const [weekday, ...rest] = day.label.split(', ')
                const showLabel =
                  period === 'week' ||
                  (hourly ? index % 3 === 0 : index % 5 === 0 || index === report.days.length - 1)
                return (
                  <li
                    className="unave-rpt__col"
                    key={day.label}
                    title={`${day.label}: ${formatPaise(day.revenue)}, ${day.orders} order${day.orders === 1 ? '' : 's'}`}
                  >
                    <span className="unave-rpt__col-track">
                      <span
                        className={`unave-rpt__col-bar${day.revenue === 0 ? ' is-zero' : ''}`}
                        style={{ height: `${(day.revenue / busiest) * 100}%` }}
                      />
                    </span>
                    <span className={`unave-rpt__col-label${showLabel ? '' : ' is-hidden'}`}>
                      {period === 'week' ? (
                        <>
                          <strong>{weekday}</strong> {rest.join(', ')}
                        </>
                      ) : hourly ? (
                        day.label
                      ) : (
                        rest.join(', ').split(' ')[0]
                      )}
                    </span>
                    {period === 'week' && (
                      <span aria-hidden className="unave-rpt__col-value">
                        {formatPaise(day.revenue)}
                      </span>
                    )}
                    <span className="unave-rpt__sr">
                      {day.label}: {formatPaise(day.revenue)}, {day.orders} orders
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>

          <div className="unave-rpt__grid">
            <section className="unave-rpt__card">
              <div className="unave-rpt__card-head">
                <h3>Products</h3>
                <p className="unave-rpt__muted">
                  {report.products.length} product{report.products.length === 1 ? '' : 's'}
                </p>
              </div>
              <ul className="unave-rpt__list">
                {report.products.map((product) => (
                  <li className="unave-rpt__row" key={`${product.title}-${product.duration}`}>
                    <div className="unave-rpt__row-main">
                      <span className="unave-rpt__row-title">{product.title}</span>
                      <span className="unave-rpt__muted">
                        {[product.duration, `${product.qty} sold`].filter(Boolean).join(' · ')}
                      </span>
                      <Share value={percent(product.revenue, totals.revenue)} />
                    </div>
                    <span className="unave-rpt__row-value">{formatPaise(product.revenue)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="unave-rpt__stack">
              <section className="unave-rpt__card">
                <div className="unave-rpt__card-head">
                  <h3>Payment methods</h3>
                </div>
                <ul className="unave-rpt__list">
                  {report.methods.map((method) => (
                    <li className="unave-rpt__row" key={method.method}>
                      <div className="unave-rpt__row-main">
                        <span className="unave-rpt__row-title">{method.method}</span>
                        <span className="unave-rpt__muted">
                          {method.orders} order{method.orders === 1 ? '' : 's'} ·{' '}
                          {percent(method.revenue, totals.revenue)}%
                        </span>
                        <Share value={percent(method.revenue, totals.revenue)} />
                      </div>
                      <span className="unave-rpt__row-value">{formatPaise(method.revenue)}</span>
                    </li>
                  ))}
                </ul>
              </section>

<section className="unave-rpt__card unave-rpt__note">
                <h3>In the downloads</h3>
                <p>
                  The PDF lists every order with its address and payment on landscape pages. The Excel
                  file adds every field of every order, plus one row per product in Order lines.
                </p>
              </section>
            </div>
          </div>

          <section className="unave-rpt__card unave-rpt__orders" id="orders">
            <div className="unave-rpt__card-head">
              <h3>Orders</h3>
              <p className="unave-rpt__muted">
                {pageCount > 1
                  ? `Showing ${firstIndex + 1}–${firstIndex + pageRows.length} of ${report.rows.length}, oldest first`
                  : `${report.rows.length} paid order${report.rows.length === 1 ? '' : 's'}, oldest first`}
              </p>
            </div>
            <div className="unave-rpt__table-wrap" role="region" aria-label="Orders" tabIndex={0}>
              <table className="unave-rpt__table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Delivery address</th>
                    <th scope="col">Items</th>
                    <th scope="col">Payment</th>
                    <th className="is-num" scope="col">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link className="unave-rpt__order-link" href={`/admin/collections/orders/${row.id}`}>
                          #{row.id}
                        </Link>
                        <span className="unave-rpt__sub">
                          {istFormat(row.paidAt, { day: 'numeric', hour: 'numeric', minute: '2-digit', month: 'short' })}
                        </span>
                        {row.startsOn && (
                          <span className="unave-rpt__sub">
                            Starts {istFormat(row.startsOn, { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </td>
                      <td>
                        <strong>{row.customer || 'No name'}</strong>
                        {row.phone && <span className="unave-rpt__sub">{row.phone}</span>}
                        {row.email && <span className="unave-rpt__sub">{row.email}</span>}
                      </td>
                      <td>
                        {[row.addressLine1, row.addressLine2].filter(Boolean).map((line) => (
                          <span className="unave-rpt__line" key={line}>
                            {line}
                          </span>
                        ))}
                        <span className="unave-rpt__line">
                          {[row.city, [row.state, row.pincode].filter(Boolean).join(' ')]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                        {row.foodPreference && <span className="unave-rpt__sub">Food: {row.foodPreference}</span>}
                        {row.note && <span className="unave-rpt__sub">Note: {row.note}</span>}
                      </td>
                      <td>
                        {row.items.split('; ').map((item, index) => (
                          <span className="unave-rpt__line" key={`${item}-${index}`}>
                            {item}
                          </span>
                        ))}
                      </td>
                      <td>
                        <span className="unave-rpt__line">{row.paymentDetail || row.method}</span>
                        {row.paymentId && <span className="unave-rpt__sub unave-rpt__mono">{row.paymentId}</span>}
                      </td>
                      <td className="is-num">
                        <strong>{formatPaise(row.total)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pageCount > 1 && (
              <nav aria-label="Orders pages" className="unave-rpt__pager">
                {page > 1 ? (
                  <Link className="unave-rpt__pager-step" href={viewHref(period, range.key, page - 1)} rel="prev">
                    <ChevronLeft aria-hidden size={16} />
                    Previous
                  </Link>
                ) : (
                  <span aria-disabled="true" className="unave-rpt__pager-step is-disabled">
                    <ChevronLeft aria-hidden size={16} />
                    Previous
                  </span>
                )}
                <ol className="unave-rpt__pager-pages">
                  {pageList(page, pageCount).map((item, index) =>
                    item === 'gap' ? (
                      <li aria-hidden className="unave-rpt__pager-gap" key={`gap-${index}`}>
                        …
                      </li>
                    ) : (
                      <li key={item}>
                        {item === page ? (
                          <span aria-current="page" className="unave-rpt__pager-page is-current">
                            {item}
                          </span>
                        ) : (
                          <Link
                            aria-label={`Page ${item}`}
                            className="unave-rpt__pager-page"
                            href={viewHref(period, range.key, item)}
                          >
                            {item}
                          </Link>
                        )}
                      </li>
                    ),
                  )}
                </ol>
                {page < pageCount ? (
                  <Link className="unave-rpt__pager-step" href={viewHref(period, range.key, page + 1)} rel="next">
                    Next
                    <ChevronRight aria-hidden size={16} />
                  </Link>
                ) : (
                  <span aria-disabled="true" className="unave-rpt__pager-step is-disabled">
                    Next
                    <ChevronRight aria-hidden size={16} />
                  </span>
                )}
              </nav>
            )}
          </section>
        </>
      )}
    </>
  )
}
