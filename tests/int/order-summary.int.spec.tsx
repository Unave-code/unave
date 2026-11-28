import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { OrderPaymentView } from '@/components/Admin/OrderSummary/OrderPaymentView'
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

  it('adds no choices row to a subscription bought without picks', () => {
    const plain = describeOrderLine(
      { product: null, productTitle: 'Meal plan: Low-GI Dinner', days: 12, qty: 1, unitPrice: 298800, durationLabel: 'Dinner · 2 weeks · 1 person' },
      { groups: [], trialLengths: [] },
    )
    render(<OrderSummaryView {...props({ lines: [plain] })} />)

    expect(screen.queryByText('Choices')).toBeNull()
    expect(screen.queryByText(/No options/)).toBeNull()
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

  it('shows only the details the order has', () => {
    const base = props()
    render(
      <OrderSummaryView
        {...props({
          customer: { id: 7, name: null, email: 'dummy@unave.test', phone: null },
          order: {
            ...base.order,
            delivery: { name: 'Dummy Customer', addressLine1: '12, Green Park', city: 'Pune', foodPreference: 'none' },
          },
        })}
      />,
    )

    expect(screen.queryByText(/Not given|Not recorded|Not set/)).toBeNull()
    expect(screen.queryByText('Customer note')).toBeNull()
    expect(screen.queryByText('Food preference')).toBeNull()
    expect(screen.queryByText('Phone')).toBeNull()
    expect(screen.getByText('dummy@unave.test')).toBeTruthy()
  })

  it('keeps the payment out of the main column', () => {
    render(<OrderSummaryView {...props()} />)

    expect(screen.queryByRole('heading', { name: 'Payment' })).toBeNull()
    expect(screen.queryByText('order_seed_9')).toBeNull()
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

describe('the payment block in the sidebar', () => {
  it('shows the Razorpay ids and the paid time', () => {
    render(
      <OrderPaymentView
        gatewayOrderId="order_seed_9"
        gatewayPaymentId="pay_seed_9"
        paidAt="2026-11-21T06:00:00.000Z"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Payment' })).toBeTruthy()
    expect(screen.getByText('order_seed_9')).toBeTruthy()
    expect(screen.getByText('pay_seed_9')).toBeTruthy()
    expect(screen.getByText('21 Nov 2026, 11:30 am')).toBeTruthy()
  })

  it('shows a UPI payment as Razorpay sent it', () => {
    render(
      <OrderPaymentView
        details={{
          bankReference: '322206890934',
          capturedAt: '2026-11-21T06:00:00.000Z',
          contact: '+919876543210',
          email: 'asha@example.com',
          fee: 354,
          method: 'upi',
          tax: 54,
          vpa: 'asha@okhdfc',
        }}
        gatewayOrderId="order_seed_9"
        gatewayPaymentId="pay_seed_9"
        paidAt="2026-11-21T06:00:05.000Z"
      />,
    )

    expect(screen.getByText('UPI')).toBeTruthy()
    expect(screen.getByText('asha@okhdfc')).toBeTruthy()
    expect(screen.getByText('322206890934')).toBeTruthy()
    expect(screen.getByText('₹3.54')).toBeTruthy()
    expect(screen.getByText('₹0.54')).toBeTruthy()
    expect(screen.getByText('asha@example.com')).toBeTruthy()
    expect(screen.getByText('+919876543210')).toBeTruthy()
    expect(screen.getByText('21 Nov 2026, 11:30 am')).toBeTruthy()
  })

  it('shows a card by its network, type and last four digits', () => {
    render(
      <OrderPaymentView
        details={{ cardLast4: '0153', cardNetwork: 'Visa', cardType: 'debit', method: 'card' }}
        gatewayOrderId="order_seed_3"
      />,
    )

    expect(screen.getByText('Card')).toBeTruthy()
    expect(screen.getByText('Visa debit ···· 0153')).toBeTruthy()
  })

  it('shows the bank of a netbanking payment', () => {
    render(<OrderPaymentView details={{ bank: 'HDFC', method: 'netbanking' }} gatewayOrderId="order_seed_2" />)

    expect(screen.getByText('Netbanking')).toBeTruthy()
    expect(screen.getByText('HDFC')).toBeTruthy()
  })

  it('leaves out an id the order does not have', () => {
    render(<OrderPaymentView gatewayOrderId="order_seed_9" gatewayPaymentId={null} paidAt={null} />)

    expect(screen.queryByText('Razorpay payment')).toBeNull()
    expect(screen.queryByText('Paid at')).toBeNull()
    expect(screen.queryByText('Method')).toBeNull()
    expect(screen.queryByText('Razorpay fee')).toBeNull()
  })
})

describe('the payment block for a cash on delivery order', () => {
  it('shows a cash-due order with the staff actions', () => {
    render(
      <OrderPaymentView
        actions={<button type="button">Mark cash collected</button>}
        cash={{ state: 'cashDue' }}
        paidAt={null}
      />,
    )

    expect(screen.getByText('Cash on delivery')).toBeTruthy()
    expect(screen.getByText('Cash due')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mark cash collected' })).toBeTruthy()
    expect(screen.queryByText('Razorpay order')).toBeNull()
  })

  it('shows who collected the cash and when, without actions', () => {
    render(
      <OrderPaymentView
        actions={null}
        cash={{ collectedBy: 'Kitchen staff', state: 'collected' }}
        paidAt="2026-11-21T06:00:00.000Z"
      />,
    )

    expect(screen.getByText('Collected')).toBeTruthy()
    expect(screen.getByText('Kitchen staff')).toBeTruthy()
    expect(screen.getByText('21 Nov 2026, 11:30 am')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows when a cash order was cancelled', () => {
    render(<OrderPaymentView cash={{ cancelledAt: '2026-11-21T06:00:00.000Z', state: 'cancelled' }} />)

    expect(screen.getByText('Cancelled')).toBeTruthy()
    expect(screen.getByText('Cancelled at')).toBeTruthy()
  })
})

describe('the admin order summary for a cash on delivery order', () => {
  const cashOrder = (paymentState: 'cancelled' | 'cashDue' | 'collected') =>
    props({
      order: {
        ...props().order,
        gatewayOrderId: null,
        gatewayPaymentId: null,
        paidAt: paymentState === 'collected' ? '2026-11-21T06:00:00.000Z' : null,
        paymentState,
        paymentType: 'cash',
      },
    })

  it('says Cash due, not Paid, while the cash is owed', () => {
    render(<OrderSummaryView {...cashOrder('cashDue')} />)

    expect(screen.getByText('Cash due')).toBeTruthy()
    expect(screen.queryByText('Paid')).toBeNull()
  })

  it('says Collected once the cash is in', () => {
    render(<OrderSummaryView {...cashOrder('collected')} />)

    expect(screen.getByText('Collected')).toBeTruthy()
  })

  it('says Cancelled for a cancelled cash order', () => {
    render(<OrderSummaryView {...cashOrder('cancelled')} />)

    expect(screen.getByText('Cancelled')).toBeTruthy()
  })
})
