import type { CollectionSlug, Payload, Where } from 'payload'

/**
 * The kitchen's day is an Indian day, whatever timezone the server happens to
 * run in: production deploys in UTC, so "today" is measured from midnight IST
 * (UTC+5:30), not from the server's own midnight.
 */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export const istStartOfDay = (daysAgo = 0): Date => {
  const shifted = new Date(Date.now() + IST_OFFSET_MS)
  const utcMidnight = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  )

  return new Date(utcMidnight - IST_OFFSET_MS - daysAgo * DAY_MS)
}

export type DayPoint = {
  /** Midnight IST that opens the day. */
  start: Date
  /** "15 Nov" — used in tooltips and the table view. */
  label: string
  value: number
}

const dayLabel = (start: Date): string =>
  new Date(start.getTime() + IST_OFFSET_MS).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })

/**
 * One value per IST day for the last `days` days, oldest first, today last.
 * Each matching document adds `amount(doc)` (1 by default, so a plain count)
 * to the day its `dateField` falls in.
 */
export const dailySeries = async <T extends Record<string, unknown>>({
  collection,
  dateField,
  days = 14,
  payload,
  amount = () => 1,
  where,
}: {
  collection: CollectionSlug
  dateField: string
  days?: number
  payload: Payload
  amount?: (doc: T) => number
  where?: Where
}): Promise<DayPoint[]> => {
  const from = istStartOfDay(days - 1)

  const result = await payload.find({
    collection,
    depth: 0,
    limit: 5000,
    pagination: false,
    where: {
      and: [{ [dateField]: { greater_than_equal: from.toISOString() } }, ...(where ? [where] : [])],
    },
  })

  const points: DayPoint[] = Array.from({ length: days }, (_, i) => {
    const start = new Date(from.getTime() + i * DAY_MS)
    return { label: dayLabel(start), start, value: 0 }
  })

  for (const doc of result.docs as unknown as T[]) {
    const at = doc[dateField]
    if (!at) continue
    const index = Math.floor((new Date(String(at)).getTime() - from.getTime()) / DAY_MS)
    if (index >= 0 && index < days) points[index].value += amount(doc)
  }

  return points
}
