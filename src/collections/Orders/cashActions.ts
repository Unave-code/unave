import { sql } from '@payloadcms/db-postgres'
import type { Endpoint, Payload, PayloadRequest } from 'payload'

import { hasStaffRole } from '@/access/isStaff'
import type { Order } from '@/payload-types'
import { isSameOriginPost } from '@/utilities/formPost'

import { CROSS_SITE, json } from './checkout'

/**
 * Staff moving a cash order on (spec 2026-11-28 cash on delivery). Cash due
 * becomes Collected, which stamps `paidAt` — the moment the money counts in
 * every report — or Cancelled. Nothing else moves, and nothing moves twice.
 *
 * The change is one conditional UPDATE, so two staff clicking at once can never
 * both win: the second finds no Cash due row and answers 409.
 */

type Target = 'cancelled' | 'collected'

type TransitionResult = { ok: true; order: Order } | { ok: false; status: 404 | 409 }

type Drizzle = { execute: (query: unknown) => Promise<{ rows: unknown[] }> }

export const transitionCashOrder = async (
  payload: Payload,
  id: number | string,
  to: Target,
  staffId: number,
): Promise<TransitionResult> => {
  const orderId = Number(id)
  if (!Number.isSafeInteger(orderId) || orderId <= 0) return { ok: false, status: 404 }

  const db = (payload.db as unknown as { drizzle: Drizzle }).drizzle
  const now = new Date().toISOString()

  const changed =
    to === 'collected'
      ? await db.execute(sql`
          UPDATE "orders"
          SET "payment_state" = 'collected', "paid_at" = ${now}, "collected_by_id" = ${staffId}, "updated_at" = ${now}
          WHERE "id" = ${orderId} AND "payment_type" = 'cash' AND "payment_state" = 'cashDue'
          RETURNING "id"`)
      : await db.execute(sql`
          UPDATE "orders"
          SET "payment_state" = 'cancelled', "cancelled_at" = ${now}, "updated_at" = ${now}
          WHERE "id" = ${orderId} AND "payment_type" = 'cash' AND "payment_state" = 'cashDue'
          RETURNING "id"`)

  let order: Order

  try {
    order = (await payload.findByID({ collection: 'orders', depth: 0, id: orderId, overrideAccess: true })) as Order
  } catch {
    return { ok: false, status: 404 }
  }

  if (changed.rows.length === 0) return { ok: false, status: 409 }

  payload.logger.info({ msg: `cash_order_${to}`, order: orderId, staff: staffId })
  return { ok: true, order }
}

const NOT_ALLOWED = 'Only staff can change a cash order.'
const NOT_FOUND = 'That order could not be found.'
const ALREADY = 'This order is no longer waiting for cash. Reload the page to see where it stands.'

const cashAction = (to: Target, path: string): Endpoint => ({
  handler: async (req: PayloadRequest) => {
    if (!isSameOriginPost(req)) return json(CROSS_SITE, 403)
    if (!hasStaffRole(req.user)) return json(NOT_ALLOWED, 403)

    const id = req.routeParams?.id
    if (typeof id !== 'string' && typeof id !== 'number') return json(NOT_FOUND, 404)

    const result = await transitionCashOrder(req.payload, id, to, Number(req.user?.id))

    if (!result.ok) return json(result.status === 404 ? NOT_FOUND : ALREADY, result.status)

    return Response.json({ paymentState: result.order.paymentState })
  },
  method: 'post',
  path,
})

export const collectCashEndpoint = cashAction('collected', '/:id/collect')
export const cancelCashEndpoint = cashAction('cancelled', '/:id/cancel')
