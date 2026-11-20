import type { GlobalConfig } from 'payload'

import { isStaff } from '@/access/isStaff'

import { revalidatePlanBuilder } from './hooks/revalidatePlanBuilder'

/**
 * What every meal plan shares on /meal-subscription: the plan lengths, the
 * pick-one options, the delivery times and the list page's text. Each meal plan
 * (Catalogue → Meal plans) has its own menu and its own price per plan length.
 */
export const PlanBuilder: GlobalConfig = {
  slug: 'plan-builder',
  label: 'Meal plan settings',
  access: {
    read: () => true,
    update: isStaff,
  },
  admin: {
    description:
      'Shared by every meal plan on /meal-subscription: plan lengths, options, delivery times and the list page text. Menus and prices live on each meal plan.',
    group: 'Catalogue',
  },
  hooks: {
    afterChange: [revalidatePlanBuilder],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Plan lengths',
          fields: [
            {
              name: 'plans',
              type: 'array',
              label: 'Plan lengths',
              labels: { singular: 'Plan length', plural: 'Plan lengths' },
              minRows: 1,
              maxRows: 6,
              admin: {
                description:
                  'The lengths every meal plan is sold in. Each meal plan sets its own price for each length, using the same name.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'label', type: 'text', label: 'Name', required: true, maxLength: 30, admin: { width: '50%', placeholder: '2 weeks' } },
                    { name: 'days', type: 'number', label: 'Delivery days', required: true, min: 1, admin: { width: '25%', description: 'Mon–Sat, so 2 weeks is 12.' } },
                    { name: 'note', type: 'text', label: 'Tag', maxLength: 20, admin: { width: '25%', placeholder: 'Save 5%' } },
                  ],
                },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'lunchTime', type: 'text', label: 'Lunch delivery time', defaultValue: '12:00 – 1:30 PM', admin: { width: '50%' } },
                { name: 'dinnerTime', type: 'text', label: 'Dinner delivery time', defaultValue: '7:00 – 8:30 PM', admin: { width: '50%' } },
              ],
            },
          ],
        },
        {
          label: 'Options',
          fields: [
            {
              name: 'optionGroups',
              type: 'array',
              label: 'Options',
              labels: { singular: 'Option', plural: 'Options' },
              maxRows: 4,
              admin: {
                description:
                  'Each option is a pick-one choice, like Juice: Normal or Detox. The first choice is selected by default. Every meal plan offers these.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'title', type: 'text', label: 'Name', required: true, maxLength: 30, admin: { width: '40%', placeholder: 'Juice' } },
                    { name: 'hint', type: 'text', label: 'Help text', admin: { width: '60%', placeholder: 'One 250 ml bottle a day, with your first meal.' } },
                  ],
                },
                {
                  name: 'choices',
                  type: 'array',
                  label: 'Choices',
                  minRows: 2,
                  maxRows: 4,
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'label', type: 'text', label: 'Name', required: true, maxLength: 30, admin: { width: '30%', placeholder: 'Detox juice' } },
                        { name: 'detail', type: 'text', label: 'Description', admin: { width: '45%' } },
                        {
                          name: 'extraPerDay',
                          type: 'number',
                          label: 'Extra a day (₹)',
                          defaultValue: 0,
                          min: 0,
                          admin: {
                            width: '25%',
                            description: '0 means included.',
                            components: { Field: '@/components/Admin/RupeeField#RupeeField' },
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'List page text',
          fields: [
            { name: 'eyebrow', type: 'text', label: 'Small heading', defaultValue: 'Meal subscription' },
            { name: 'heading', type: 'text', label: 'Heading', defaultValue: 'A fresh home-style menu every week' },
            {
              name: 'intro',
              type: 'textarea',
              label: 'Intro',
              defaultValue: 'Choose a meal plan, see what we are cooking, pick your options, then pay securely.',
            },
          ],
        },
      ],
    },
  ],
}
