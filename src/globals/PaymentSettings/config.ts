import type { GlobalConfig } from 'payload'

import { isStaff } from '@/access/isStaff'

/**
 * Whether checkout offers cash on delivery, and up to what order total
 * (spec 2026-11-28 cash on delivery). The checkout page hides the choice when
 * it is off or over the limit, and the cash endpoint refuses it the same way,
 * so a page loaded before staff changed this cannot get round it.
 */
export const PaymentSettings: GlobalConfig = {
  slug: 'payment-settings',
  label: 'Cash on delivery',
  access: {
    read: () => true,
    update: isStaff,
  },
  admin: {
    description: 'Whether customers can choose to pay in cash at their first delivery.',
    group: 'Website',
  },
  fields: [
    {
      name: 'codEnabled',
      type: 'checkbox',
      defaultValue: true,
      label: 'Offer cash on delivery at checkout',
    },
    {
      // Paise, shown and typed as rupees. Empty means no limit.
      name: 'codMaxTotal',
      type: 'number',
      admin: {
        components: {
          Field: '@/components/Admin/RupeeField#RupeeField',
        },
        description:
          'Orders above this total must be paid online. Leave empty for no limit. 3000 means ₹3,000.',
      },
      label: 'Largest cash order (₹)',
      validate: (value: unknown) =>
        value === null ||
        value === undefined ||
        (typeof value === 'number' && Number.isSafeInteger(value) && value >= 100)
          ? true
          : 'Enter at least ₹1, with at most two decimal places, or leave it empty.',
    },
  ],
}
