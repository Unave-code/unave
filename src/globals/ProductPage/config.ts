import type { GlobalConfig } from 'payload'

import { isStaff } from '@/access/isStaff'

/** The default "How your plan works" lines, one per line. */
export const DEFAULT_PLAN_HOW_IT_WORKS = [
  'Choose a plan and pay once at checkout.',
  'Our team calls you to confirm your start date and delivery details.',
  'Meals arrive fresh from our kitchen for every day of your plan.',
  'Need a pause or a change? Message us and we will sort it out.',
].join('\n')

/**
 * Words shared by every product page. Today that is the "How your plan works"
 * box on a meal plan's page; a plan can replace it with its own text on the
 * product itself.
 */
export const ProductPage: GlobalConfig = {
  slug: 'product-page',
  label: 'Product page',
  access: {
    read: () => true,
    update: isStaff,
  },
  admin: {
    description: 'Text shared by every product page.',
    group: 'Catalogue',
  },
  fields: [
    {
      name: 'planHowItWorks',
      type: 'textarea',
      label: 'How your plan works',
      defaultValue: DEFAULT_PLAN_HOW_IT_WORKS,
      admin: {
        description:
          'Shown on every meal plan’s page under the buy buttons. Write one step per line. A plan can replace this with its own text on the product. Leave empty to hide the box.',
        rows: 6,
      },
    },
  ],
}
