/**
 * The reporting periods for the orders report: a single day, a week that runs
 * Monday to Sunday, or a calendar month, all measured in Indian time (UTC+5:30),
 * whatever timezone the server runs in. The same rule as the dashboard
 * widgets (`src/components/Admin/Widgets/series.ts`).
 */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export type ReportPeriod = 'day' | 'week' | 'month'

export const REPORT_PERIODS: ReportPeriod[] = ['day', 'week', 'month']

export type ReportRange = {
  period: ReportPeriod
  /** Midnight IST that opens the period (inclusive). */
  from: Date
  /** Midnight IST that opens the next period (exclusive). */
  to: Date
  /** "2026-11-25" for a day, "2026-11-23" (the Monday) for a week, "2026-11" for a month. */
  key: string
  /** "Wed, 25 Nov 2026", "23 – 29 Nov 2026" or "November 2026". */
  label: string
  /**
   * The start of every slot the chart and the breakdown use, oldest first:
   * each hour of a day report, each midnight IST of a week or month.
   */
  days: Date[]
  /** The length of one slot in `days`: an hour for a day report, else a day. */
  step: number
}

export const isReportPeriod = (value: unknown): value is ReportPeriod =>
  value === 'day' || value === 'week' || value === 'month'

const istParts = (at: Date) => {
  const shifted = new Date(at.getTime() + IST_OFFSET_MS)
  return { d: shifted.getUTCDate(), m: shifted.getUTCMonth(), y: shifted.getUTCFullYear() }
}

const istMidnight = (y: number, m: number, d: number): Date =>
  new Date(Date.UTC(y, m, d) - IST_OFFSET_MS)

const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-11-23", the IST calendar date of an instant. */
export const istDateKey = (at: Date): string => {
  const { d, m, y } = istParts(at)
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

/** Formats the IST calendar date of an instant with en-IN options. */
export const istFormat = (at: Date, options: Intl.DateTimeFormatOptions): string =>
  new Date(at.getTime() + IST_OFFSET_MS).toLocaleString('en-IN', { ...options, timeZone: 'UTC' })

const parseKey = (period: ReportPeriod, key: string | null | undefined) => {
  if (!key) return null
  const match =
    period === 'month' ? /^(\d{4})-(\d{2})$/.exec(key) : /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return null

  const y = Number(match[1])
  const m = Number(match[2]) - 1
  const d = period === 'month' ? 1 : Number(match[3])
  const check = new Date(Date.UTC(y, m, d))

  if (y < 2000 || y > 2100) return null
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m || check.getUTCDate() !== d) return null

  return { d, m, y }
}

/**
 * The day, week or month that holds `key`, or the current one when `key` is
 * missing or does not read. Any day of a week is accepted and snaps back to
 * its Monday.
 */
export const reportRange = (
  period: ReportPeriod,
  key?: string | null,
  now: Date = new Date(),
): ReportRange => {
  const parts = parseKey(period, key) ?? istParts(now)

  let from: Date
  let to: Date
  let label: string

  if (period === 'day') {
    from = istMidnight(parts.y, parts.m, parts.d)
    to = new Date(from.getTime() + DAY_MS)
    label = `${istFormat(from, { weekday: 'short' })}, ${istFormat(from, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`
  } else if (period === 'week') {
    const dow = new Date(Date.UTC(parts.y, parts.m, parts.d)).getUTCDay()
    const back = (dow + 6) % 7
    from = istMidnight(parts.y, parts.m, parts.d - back)
    to = new Date(from.getTime() + 7 * DAY_MS)
    const last = new Date(to.getTime() - DAY_MS)
    const sameMonth = istParts(from).m === istParts(last).m
    const sameYear = istParts(from).y === istParts(last).y
    const start = istFormat(from, {
      day: 'numeric',
      ...(sameMonth ? {} : { month: 'short' }),
      ...(sameYear ? {} : { year: 'numeric' }),
    })
    label = `${start} – ${istFormat(last, { day: 'numeric', month: 'short', year: 'numeric' })}`
  } else {
    from = istMidnight(parts.y, parts.m, 1)
    to = istMidnight(parts.y, parts.m + 1, 1)
    label = istFormat(from, { month: 'long', year: 'numeric' })
  }

  const step = period === 'day' ? HOUR_MS : DAY_MS
  const days: Date[] = []
  for (let at = from.getTime(); at < to.getTime(); at += step) days.push(new Date(at))

  const { m, y } = istParts(from)
  const rangeKey = period === 'month' ? `${y}-${pad(m + 1)}` : istDateKey(from)

  return { days, from, key: rangeKey, label, period, step, to }
}

/** The period just before (`-1`) or after (`1`) a range. */
export const shiftRange = (range: ReportRange, step: -1 | 1): ReportRange => {
  if (range.period === 'day') {
    return reportRange('day', istDateKey(new Date(range.from.getTime() + step * DAY_MS)))
  }
  if (range.period === 'week') {
    return reportRange('week', istDateKey(new Date(range.from.getTime() + step * 7 * DAY_MS)))
  }
  const { m, y } = istParts(range.from)
  const next = new Date(Date.UTC(y, m + step, 1))
  return reportRange('month', `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}`)
}

/** "day", "week" or "month", for sentences like "the week before". */
export const periodNoun = (period: ReportPeriod): string => period

/** "Daily", "Weekly" or "Monthly". */
export const periodAdjective = (period: ReportPeriod): string =>
  ({ day: 'Daily', month: 'Monthly', week: 'Weekly' })[period]
