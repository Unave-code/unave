import type { UIFieldServerProps } from 'payload'
import React from 'react'

import type { Customer, MealPlan, Order, OrderRequest } from '@/payload-types'
import { describeOrderLine, mealPlanTitle, type PlanLookup } from '@/utilities/orderLines'
import { normalizeMealPlan } from '@/utilities/planBuilder'

import { OrderSummaryView, type OrderSummaryProps } from './OrderSummaryView'

/**
 * The order page's summary, as a `ui` field at the top of the Orders form
 * (design: docs/superpowers/specs/2026-11-21-admin-order-detail-design.md).
 *
 * Loads what one order row does not hold: the customer, the customer's
 * requests on this order, and the meal plans its subscription lines name, so
 * each pick can sit under its option group. A meal plan that has since been
 * renamed or removed leaves its picks as a plain list, never an error.
 */
export const OrderSummary: React.FC<UIFieldServerProps> = async ({ id, payload }) => {
  if (id === undefined || id === null || id === '') return null

  let order: Order

  try {
    order = (await payload.findByID({ collection: 'orders', depth: 0, id, overrideAccess: true })) as Order
  } catch {
    return null
  }

  const customerId = typeof order.customer === 'object' && order.customer ? order.customer.id : order.customer
  const titles = [...new Set((order.items ?? []).map((item) => mealPlanTitle(item.productTitle)).filter((t): t is string => t !== null))]

  const [customer, requests, plans] = await Promise.all([
    payload
      .findByID({
        collection: 'customers',
        depth: 0,
        id: customerId as number,
        overrideAccess: true,
        select: { email: true, name: true, phone: true },
      })
      .then((doc) => doc as Pick<Customer, 'email' | 'id' | 'name' | 'phone'>)
      .catch(() => null),
    payload
      .find({
        collection: 'order-requests',
        depth: 0,
        limit: 50,
        overrideAccess: true,
        sort: '-createdAt',
        where: { order: { equals: order.id } },
      })
      .then((found) => found.docs as OrderRequest[])
      .catch(() => [] as OrderRequest[]),
    titles.length === 0
      ? Promise.resolve([] as MealPlan[])
      : payload
          .find({ collection: 'meal-plans', depth: 1, limit: titles.length, overrideAccess: true, where: { title: { in: titles } } })
          .then((found) => found.docs as MealPlan[])
          .catch(() => [] as MealPlan[]),
  ])

  const lookups = new Map<string, PlanLookup>()
  for (const doc of plans) {
    const data = normalizeMealPlan(doc)
    lookups.set(data.title, {
      groups: data.optionGroups.map((group) => ({ choices: group.choices.map((choice) => choice.label), title: group.title })),
      trialLengths: data.plans.filter((plan) => plan.trial).map((plan) => plan.label),
    })
  }

  const props: OrderSummaryProps = {
    customer: customer
      ? { email: customer.email, id: Number(customer.id), name: customer.name ?? null, phone: customer.phone ?? null }
      : null,
    lines: (order.items ?? []).map((item) => {
      const title = mealPlanTitle(item.productTitle)
      return describeOrderLine(item, title ? (lookups.get(title) ?? null) : null)
    }),
    order,
    requests,
  }

  return <OrderSummaryView {...props} />
}
