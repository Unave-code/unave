import type { Field, GlobalConfig } from 'payload'

import { isStaff } from '@/access/isStaff'

import { revalidatePlanBuilder } from './hooks/revalidatePlanBuilder'

const DAYS = [
  { name: 'mon', label: 'Monday' },
  { name: 'tue', label: 'Tuesday' },
  { name: 'wed', label: 'Wednesday' },
  { name: 'thu', label: 'Thursday' },
  { name: 'fri', label: 'Friday' },
  { name: 'sat', label: 'Saturday' },
] as const

/** One price per plan, in paise; the RupeeField shows and takes rupees. */
const rupee = (name: string, label: string): Field => ({
  name,
  label,
  type: 'number',
  required: true,
  min: 1,
  admin: {
    width: '33%',
    components: { Field: '@/components/Admin/RupeeField#RupeeField' },
  },
})

/** A week of menu: one fixed lunch and dinner per delivery day, text only. */
const week = (name: string, label: string, description: string): Field => ({
  name,
  label,
  type: 'group',
  admin: { description },
  fields: [
    {
      name: 'range',
      type: 'text',
      label: 'Dates',
      admin: { description: 'Shown on the week switch, for example 23 – 28 Nov.' },
    },
    ...DAYS.map(
      (day): Field => ({
        name: day.name,
        label: day.label,
        type: 'group',
        fields: [
          {
            type: 'row',
            fields: [
              { name: 'lunchMain', type: 'text', label: 'Lunch', admin: { width: '50%', placeholder: 'Kadhai Paneer with carrot roti' } },
              { name: 'dinnerMain', type: 'text', label: 'Dinner', admin: { width: '50%', placeholder: 'No-Butter Soya Masala with multigrain roti' } },
            ],
          },
          {
            type: 'row',
            fields: [
              { name: 'lunchSides', type: 'text', label: 'Lunch sides', admin: { width: '50%', placeholder: 'Sprouted moong salad, Matki dal, Capsicum besan subzi' } },
              { name: 'dinnerSides', type: 'text', label: 'Dinner sides', admin: { width: '50%', placeholder: 'Mixed bean salad, Homestyle chole, Aloo gobi' } },
            ],
          },
        ],
      }),
    ),
  ],
})

/**
 * The plan builder at /meal-subscription: the weekly menu, the plan prices, the
 * pick-one options and the page text. The kitchen sets the meals; customers
 * only choose their meals, plan length, people and options, then pay through
 * the cart. Every price the cart charges is read from here on the server.
 */
export const PlanBuilder: GlobalConfig = {
  slug: 'plan-builder',
  label: 'Plan builder',
  access: {
    read: () => true,
    update: isStaff,
  },
  admin: {
    description: 'The weekly menu, plan prices and options on the Build your plan page (/meal-subscription).',
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
          label: 'Menu',
          description:
            'One fixed lunch and dinner per day. Write the main dish with its roti or rice, and the sides separated by commas. Each week, copy next week into this week and write the new next week.',
          fields: [
            week('thisWeek', 'This week', 'The menu customers see first.'),
            week('nextWeek', 'Next week', 'Shown on the Next week switch. Leave empty to hide the switch.'),
          ],
        },
        {
          label: 'Plans and prices',
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
                  'Each plan length with its price for one person. Customers pick lunch, dinner or both, and the matching price is charged.',
                initCollapsed: false,
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
                {
                  type: 'row',
                  fields: [
                    rupee('lunchPrice', 'Lunch only (₹)'),
                    rupee('dinnerPrice', 'Dinner only (₹)'),
                    rupee('bothPrice', 'Lunch and dinner (₹)'),
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
                  'Each option is a pick-one choice, like Juice: Normal or Detox. The first choice is selected by default.',
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
          label: 'Page text',
          fields: [
            { name: 'eyebrow', type: 'text', label: 'Small heading', defaultValue: 'Plan builder' },
            { name: 'heading', type: 'text', label: 'Heading', defaultValue: 'A fresh home-style menu every week' },
            {
              name: 'intro',
              type: 'textarea',
              label: 'Intro',
              defaultValue: 'Pick your plan, see what we are cooking, choose your options, then pay securely.',
            },
            { name: 'noticeTitle', type: 'text', label: 'Notice heading', defaultValue: 'Cooking around a health need?' },
            {
              name: 'noticeBody',
              type: 'textarea',
              label: 'Notice text',
              defaultValue:
                "Tell us about allergies, diabetes or a diet your doctor gave you in the order note. We cook to your notes, but our meals are not medical treatment and we can't promise any result.",
            },
          ],
        },
      ],
    },
  ],
}
