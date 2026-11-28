import type { CollectionConfig } from 'payload'

import { hasStaffRole, isStaff } from '../../access/isStaff'
import { staffOrOrderOwner } from '../../access/staffOrOrderOwner'

import { createOrderEndpoint, verifyOrderEndpoint } from './endpoints'
import { orderReportEndpoint } from './report'

/** Takes a snapshot field out of the edit form; OrderSummary shows it instead. */
const HIDDEN_IN_FORM = '@/components/Admin/HiddenField#HiddenField'

/**
 * The record of a purchase (spec 0007).
 *
 * A row is written exactly once, by the payment confirmation with
 * `overrideAccess` — public REST create stays off, so no browser can mint one
 * or choose its amounts, and it is written only when a payment has been
 * captured, so a row always means one completed order. Cash on delivery is the
 * one exception: a cash order is written at checkout as Cash due, and only
 * staff move it to Collected or Cancelled (cash.ts, cashActions.ts). Every money and delivery
 * value is snapshotted at creation and never edited again: editing a product's
 * title or price afterwards must never rewrite history, so the snapshot fields
 * below refuse updates at the field level, for staff too. The one staff writable
 * field is `startsOn`, the day deliveries actually begin.
 *
 * GraphQL is off outright. The collection's read rule already limits rows to
 * staff and the owning customer, but turning the generated API off removes the
 * second door entirely.
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  access: {
    create: () => false,
    delete: () => false,
    read: staffOrOrderOwner,
    update: isStaff,
  },
  admin: {
    components: {
      beforeList: ['@/components/Admin/Reports/ReportsLink'],
    },
    defaultColumns: ['customer', 'total', 'paymentState', 'createdAt'],
    description:
      'One row per order, holding up to ten product lines. Online orders are written once payment is captured; cash orders are written at checkout and show as Cash due until staff mark them collected. Amounts are shown in rupees.',
    group: 'Orders',
    useAsTitle: 'id',
  },
  fields: [
    {
      // The Razorpay mode, read from the key id's prefix (AC-13). Presentational
      // only: a `ui` field stores nothing, so it adds no column and no migration.
      name: 'paymentMode',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/Admin/PaymentModeNotice#PaymentModeNotice',
        },
      },
    },
    {
      // The whole order as plain text, the way a receipt reads (OrderSummary).
      // The snapshot fields below are taken out of the form, so this is the
      // only place staff read them; the list view still shows them as columns.
      name: 'summary',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/Admin/OrderSummary#OrderSummary',
        },
      },
    },
    {
      name: 'customer',
      type: 'relationship',
      access: {
        update: () => false,
      },
      admin: {
        components: { Field: HIDDEN_IN_FORM },
        position: 'sidebar',
      },
      index: true,
      maxDepth: 0,
      relationTo: 'customers',
      required: true,
    },
    {
      name: 'items',
      type: 'array',
      access: {
        update: () => false,
      },
      admin: {
        components: { Field: HIDDEN_IN_FORM },
        description: 'What was bought, copied from the product at purchase time. Product edits never change these rows.',
      },
      fields: [
        {
          name: 'product',
          type: 'relationship',
          maxDepth: 0,
          relationTo: 'products',
        },
        {
          name: 'productTitle',
          type: 'text',
        },
        {
          name: 'durationLabel',
          type: 'text',
        },
        {
          name: 'days',
          type: 'number',
        },
        {
          name: 'qty',
          type: 'number',
          defaultValue: 1,
          label: 'Quantity',
          min: 1,
          admin: {
            description:
              'How many of the product the line holds. A meal plan line is one; a one-time purchase can be up to ten.',
          },
        },
        {
          name: 'unitPrice',
          type: 'number',
          admin: {
            components: {
              Field: '@/components/Admin/RupeeField#RupeeField',
            },
            readOnly: true,
          },
          label: 'Unit price (₹)',
        },
        {
          // The product's own price at purchase; empty on orders from before add-ons.
          name: 'basePrice',
          type: 'number',
          admin: {
            components: {
              Field: '@/components/Admin/RupeeField#RupeeField',
            },
            readOnly: true,
          },
          label: 'Product price (₹)',
        },
        {
          name: 'addons',
          type: 'array',
          maxRows: 6,
          admin: {
            description: 'The extras ticked with this line, copied at purchase time. Each is charged once per item.',
          },
          fields: [
            { name: 'addon', type: 'relationship', relationTo: 'addons', maxDepth: 0 },
            { name: 'title', type: 'text', required: true },
            {
              name: 'price',
              type: 'number',
              required: true,
              min: 1,
              label: 'Price (₹)',
              admin: {
                components: { Field: '@/components/Admin/RupeeField#RupeeField' },
                readOnly: true,
              },
            },
          ],
        },
        {
          name: 'components',
          type: 'array',
          maxRows: 10,
          admin: {
            description: 'The combo contents copied at purchase time.',
            condition: (_, siblingData) =>
              siblingData?.durationLabel === 'one-time' &&
              Array.isArray(siblingData?.components) &&
              siblingData.components.length > 0,
          },
          fields: [
            {
              name: 'product',
              type: 'relationship',
              relationTo: 'products',
              maxDepth: 0,
            },
            { name: 'productTitle', type: 'text', required: true },
            { name: 'durationLabel', type: 'text' },
            { name: 'days', type: 'number' },
          ],
        },
      ],
      required: true,
    },
    {
      name: 'delivery',
      type: 'group',
      access: {
        update: () => false,
      },
      admin: {
        components: { Field: HIDDEN_IN_FORM },
        description: 'Where to deliver, as the customer entered it at checkout.',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
        },
        {
          name: 'phone',
          type: 'text',
        },
        {
          name: 'addressLine1',
          type: 'text',
        },
        {
          name: 'addressLine2',
          type: 'text',
        },
        {
          name: 'city',
          type: 'text',
        },
        {
          name: 'state',
          type: 'text',
        },
        {
          name: 'pincode',
          type: 'text',
        },
        {
          name: 'foodPreference',
          type: 'text',
        },
        {
          name: 'note',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'subtotal',
      type: 'number',
      access: {
        update: () => false,
      },
      admin: {
        components: {
          Field: HIDDEN_IN_FORM,
        },
        readOnly: true,
      },
      label: 'Subtotal (₹)',
    },
    {
      name: 'total',
      type: 'number',
      access: {
        update: () => false,
      },
      admin: {
        components: {
          Cell: '@/components/Admin/RupeeCell#RupeeCell',
          Field: HIDDEN_IN_FORM,
        },
        readOnly: true,
      },
      label: 'Total (₹)',
    },
    {
      name: 'gatewayOrderId',
      type: 'text',
      access: {
        update: () => false,
      },
      admin: {
        components: { Field: HIDDEN_IN_FORM },
        position: 'sidebar',
      },
      index: true,
      unique: true,
      label: 'Razorpay order id',
    },
    {
      name: 'gatewayPaymentId',
      type: 'text',
      access: {
        update: () => false,
      },
      admin: {
        components: { Field: HIDDEN_IN_FORM },
        position: 'sidebar',
      },
      label: 'Razorpay payment id',
    },
    {
      name: 'gatewaySignature',
      type: 'text',
      access: {
        update: () => false,
      },
      admin: {
        hidden: true,
      },
      label: 'Razorpay signature',
    },
    {
      name: 'paidAt',
      type: 'date',
      access: {
        update: () => false,
      },
      admin: {
        components: { Field: HIDDEN_IN_FORM },
        position: 'sidebar',
        readOnly: true,
      },
      label: 'Paid at',
    },
    {
      // Online orders arrive paid; cash orders are written at checkout and
      // wait for the cash (spec 2026-11-28 cash on delivery). `payment.method`
      // below is Razorpay's own method (upi, card), hence a different name.
      name: 'paymentType',
      type: 'select',
      access: {
        update: () => false,
      },
      admin: {
        components: { Field: HIDDEN_IN_FORM },
        position: 'sidebar',
      },
      defaultValue: 'online',
      index: true,
      label: 'Paid by',
      options: [
        { label: 'Online', value: 'online' },
        { label: 'Cash on delivery', value: 'cash' },
      ],
      required: true,
    },
    {
      // Changed only through the collect and cancel endpoints (cashActions.ts),
      // which allow nothing but cashDue → collected or cashDue → cancelled.
      name: 'paymentState',
      type: 'select',
      access: {
        update: () => false,
      },
      admin: {
        components: { Field: HIDDEN_IN_FORM },
        position: 'sidebar',
      },
      defaultValue: 'paid',
      index: true,
      label: 'Payment',
      options: [
        { label: 'Online', value: 'paid' },
        { label: 'Cash due', value: 'cashDue' },
        { label: 'Collected', value: 'collected' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      required: true,
    },
    {
      name: 'collectedBy',
      type: 'relationship',
      access: {
        update: () => false,
      },
      admin: {
        components: { Field: HIDDEN_IN_FORM },
        position: 'sidebar',
      },
      label: 'Cash collected by',
      maxDepth: 0,
      relationTo: 'users',
    },
    {
      name: 'cancelledAt',
      type: 'date',
      access: {
        update: () => false,
      },
      admin: {
        components: { Field: HIDDEN_IN_FORM },
        position: 'sidebar',
        readOnly: true,
      },
      label: 'Cancelled at',
    },
    {
      // A key the checkout page makes once per visit: a second "Place order"
      // with the same key finds the first order instead of writing another.
      name: 'cashKey',
      type: 'text',
      access: {
        read: ({ req }) => hasStaffRole(req.user),
        update: () => false,
      },
      admin: {
        hidden: true,
      },
      index: true,
      unique: true,
    },
    {
      // What Razorpay told us about the payment, copied once when the order is
      // written (razorpayPaymentDetails.ts). Only values Razorpay sent are
      // stored; OrderPayment shows them in the sidebar.
      name: 'payment',
      type: 'group',
      access: {
        update: () => false,
      },
      admin: {
        components: { Field: HIDDEN_IN_FORM },
        position: 'sidebar',
      },
      label: 'Payment details',
      fields: [
        { name: 'method', type: 'text' },
        { name: 'vpa', type: 'text', label: 'UPI id' },
        { name: 'cardNetwork', type: 'text' },
        { name: 'cardType', type: 'text' },
        { name: 'cardLast4', type: 'text', label: 'Card last 4' },
        { name: 'bank', type: 'text' },
        { name: 'wallet', type: 'text' },
        { name: 'bankReference', type: 'text', label: 'Bank reference (RRN)' },
        { name: 'fee', type: 'number', label: 'Razorpay fee (paise)' },
        { name: 'tax', type: 'number', label: 'GST on fee (paise)' },
        { name: 'email', type: 'text', label: 'Payer email' },
        { name: 'contact', type: 'text', label: 'Payer phone' },
        { name: 'capturedAt', type: 'date', label: 'Captured at' },
      ],
    },
    {
      // Razorpay ids and the paid time, above the start day (OrderPayment).
      name: 'paymentSummary',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/Admin/OrderSummary/OrderPayment#OrderPayment',
        },
        position: 'sidebar',
      },
    },
    {
      name: 'startsOn',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
        description: 'When deliveries begin. The kitchen sets this, nobody else.',
        position: 'sidebar',
      },
      label: 'Deliveries start on',
    },
  ],
  endpoints: [orderReportEndpoint, createOrderEndpoint, verifyOrderEndpoint],
  graphQL: false,
  labels: {
    plural: 'Orders',
    singular: 'Order',
  },
  timestamps: true,
}
