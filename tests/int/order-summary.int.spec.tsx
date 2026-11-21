import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { OrderSummaryView, type OrderSummaryProps } from '@/components/Admin/OrderSummary/OrderSummaryView'
import { describeOrderLine, type PlanLookup } from '@/utilities/orderLines'

/**
 * The admin order page's summary, rendered from plain props. The page must
 * read like a receipt: every value as text, nothing that looks editable, and
 * a sensible line when something the order points at has gone.
 */

afterEach(cleanup)

const lookup: PlanLookup = {
  trialLengths: ['3-day trial'],
  groups: [
    { title: 'Base', choices: ['Multigrain roti', 'Brown rice', 'Quinoa'] },
    { title: 'Spice level', choices: ['Mild', 'Medium', 'Spicy'] },
    { title: 'Protein add-ons', choices: ['Extra paneer', 'Boiled eggs', 'Sprouts bowl'] },
    { title: 'Drinks and sides', choices: ['Buttermilk', 'Detox juice', 'Fruit bowl'] },
  ],
}

const subscription = describeOrderLine(
  {
    product: null,
    productTitle: 'Meal plan: High Protein Meals',
    days: 6,
    qty: 1,
    unitPrice: 736800,
    durationLabel:
      'Lunch and dinner · 1 week · 2 people · Quinoa · Medium · Extra paneer · Boiled eggs · Buttermilk · Fruit bowl',
  },
  lookup,
)

const trial = describeOrderLine(
  {
    product: null,
    productTitle: 'Meal plan: High Protein Meals',
    days: 3,
    qty: 1,
    unitPrice: 83700,
    durationLabel: 'Dinner · 3-day trial · 1 person · Brown rice · Mild · Sprouts bowl',
  },
  lookup,
)

const props = (over: Partial<OrderSummaryProps> = {}): OrderSummaryProps => ({
  order: {
    id: 360,
    createdAt: '2026-11-21T06:00:00.000Z',
    updatedAt: '2026-11-21T06:00:00.000Z',
    paidAt: '2026-11-21T06:00:00.000Z',
    subtotal: 736800,
    total: 736800,
    gatewayOrderId: 'order_seed_9',
    gatewayPaymentId: 'pay_seed_9',
    delivery: {
      name: 'Dummy Customer',
      phone: '9876543210',
      addressLine1: '12, Green Park Apartments',
      addressLine2: 'Near Lake Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      foodPreference: 'vegetarian',
      note: 'No onion or garlic, please.',
    },
  },
  customer: { id: 7, name: 'Dummy Customer', email: 'dummy@unave.test', phone: '9876543210' },
  lines: [subscription],
  requests: [],
  ...over,
})

describe('the admin order summary', () => {
  it('leads with the order number, the paid pill and the total', () => {
    render(<OrderSummaryView {...props()} />)

    expect(screen.getByRole('heading', { name: 'Order 360' })).toBeTruthy()
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0)
    expect(screen.getAllByText('₹7,368').length).toBeGreaterThan(0)
    expect(screen.getByText('1 subscription')).toBeTruthy()
  })

  it("groups a subscription's picks under their titles", () => {
    render(<OrderSummaryView {...props()} />)

    expect(screen.getByText('Protein add-ons')).toBeTruthy()
    expect(screen.getByText('Extra paneer · Boiled eggs')).toBeTruthy()
    expect(screen.getByText('Lunch and dinner')).toBeTruthy()
    expect(screen.getByText('₹1,228 a day')).toBeTruthy()
  })

  it('tags a trial', () => {
    render(<OrderSummaryView {...props({ lines: [trial] })} />)

    expect(screen.getByText('Trial')).toBeTruthy()
  })

  it("shows the customer's note and food preference label", () => {
    render(<OrderSummaryView {...props()} />)

    expect(screen.getByText('No onion or garlic, please.')).toBeTruthy()
    expect(screen.getByText('Vegetarian')).toBeTruthy()
    expect(screen.queryByText('vegetarian')).toBeNull()
  })

  it('lists requests with their status', () => {
    render(
      <OrderSummaryView
        {...props({
          requests: [
            {
              id: 4,
              type: 'pause',
              status: 'new',
              pauseFrom: '2026-11-24T00:00:00.000Z',
              pauseTo: '2026-11-27T00:00:00.000Z',
              reason: 'Travelling for a few days.',
              staffNote: null,
              createdAt: '2026-11-21T06:00:00.000Z',
            },
          ],
        })}
      />,
    )

    expect(screen.getByText('Pause')).toBeTruthy()
    expect(screen.getByText('New')).toBeTruthy()
    expect(screen.getByText('Travelling for a few days.')).toBeTruthy()
  })

  it('says so when there are no requests', () => {
    render(<OrderSummaryView {...props()} />)

    expect(screen.getByText('No requests on this order.')).toBeTruthy()
  })

  it('renders when the customer is missing', () => {
    render(<OrderSummaryView {...props({ customer: null })} />)

    expect(screen.getByText('Customer record not found')).toBeTruthy()
  })

  it('renders no form inputs', () => {
    const { container } = render(<OrderSummaryView {...props({ lines: [subscription, trial] })} />)

    expect(container.querySelectorAll('input, textarea, select').length).toBe(0)
  })
})
