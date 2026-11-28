import type { Payload } from 'payload'

import { istStartOfDay } from './series'

const DAY_MS = 24 * 60 * 60 * 1000

export type OrdersTodayFigures = {
  /** Orders placed in the day, cancelled ones left out: the kitchen's workload. */
  placed: number
  /** Paise that came in during the day: online payments and collected cash. */
  collected: number
  /** Every cash on delivery order still waiting for its cash, whenever placed. */
  cashDue: { count: number; total: number }
}

const sum = (docs: { total?: null | number }[]) => docs.reduce((total, doc) => total + (doc.total ?? 0), 0)

/**
 * The "Orders today" figures (spec 2026-11-28 cash on delivery). An order
 * counts the day it is placed, so a cash order shows up for the kitchen at
 * once; money counts the day it comes in, so cash counts once collected.
 */
export const loadOrdersToday = async (
  payload: Payload,
  from: Date = istStartOfDay(),
): Promise<OrdersTodayFigures> => {
  const to = new Date(from.getTime() + DAY_MS)
  const within = (field: 'createdAt' | 'paidAt') => [
    { [field]: { greater_than_equal: from.toISOString() } },
    { [field]: { less_than: to.toISOString() } },
  ]

  const [placed, paid, owed] = await Promise.all([
    payload.count({
      collection: 'orders',
      where: { and: [...within('createdAt'), { paymentState: { not_equals: 'cancelled' } }] },
    }),
    payload.find({
      collection: 'orders',
      depth: 0,
      pagination: false,
      select: { total: true },
      where: { and: within('paidAt') },
    }),
    payload.find({
      collection: 'orders',
      depth: 0,
      pagination: false,
      select: { total: true },
      where: { paymentState: { equals: 'cashDue' } },
    }),
  ])

  return {
    cashDue: { count: owed.docs.length, total: sum(owed.docs) },
    collected: sum(paid.docs),
    placed: placed.totalDocs,
  }
}
