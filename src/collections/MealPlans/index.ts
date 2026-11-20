import type { CollectionAfterChangeHook, CollectionConfig, FieldHook, TextFieldSingleValidation, Where } from 'payload'

import { revalidatePath } from 'next/cache'

import { anyone } from '../../access/anyone'
import { isStaff } from '../../access/isStaff'
import { menuWeekField, rupeeField } from './fields'
import { slugifyTitle } from '../Products/hooks/autoProductSlug'

/**
 * The meal plans sold on /meal-subscription, each on its own page at
 * /meal-subscription/<slug>. Everything a plan sells is on the plan itself: its
 * lengths and prices, its pick-one options, its delivery times, its weekly menu,
 * a photo and a short description. Nothing is shared between plans.
 */

/** Fills an empty slug from the title, adding -2, -3 … when one is taken. */
const autoSlug: FieldHook = async ({ data, operation, originalDoc, req, value }) => {
  if (typeof value === 'string') {
    const typed = slugifyTitle(value)
    if (typed.length > 0) return typed
  }

  const source = (data as { title?: unknown } | undefined)?.title
  const previous = (originalDoc as { title?: unknown } | undefined)?.title
  const title = typeof source === 'string' ? source : typeof previous === 'string' ? previous : ''
  const base = slugifyTitle(title) || 'meal-plan'
  const selfId = operation === 'update' ? (originalDoc as { id?: number | string } | undefined)?.id : undefined

  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`
    const where: Where =
      selfId === undefined
        ? { slug: { equals: candidate } }
        : { and: [{ slug: { equals: candidate } }, { id: { not_equals: selfId } }] }
    const clashes = await req.payload.find({ collection: 'meal-plans', depth: 0, limit: 1, overrideAccess: true, where })
    if (clashes.docs.length === 0) return candidate
  }
}

/** A length's name travels in the cart cookie, split on "|", so it cannot hold one. */
const lengthName: TextFieldSingleValidation = (value) => {
  if (!value || !value.trim()) return 'Give this plan length a name, for example 2 weeks.'
  if (value.includes('|')) return 'The name cannot contain the | character.'
  return true
}

const revalidate: CollectionAfterChangeHook = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) revalidatePath('/meal-subscription', 'layout')
  return doc
}

export const MealPlans: CollectionConfig = {
  slug: 'meal-plans',
  access: {
    create: isStaff,
    delete: isStaff,
    read: anyone,
    update: isStaff,
  },
  admin: {
    defaultColumns: ['title', 'meals', 'position', 'updatedAt'],
    description:
      'Each meal plan has its own page on /meal-subscription with its own lengths, prices, options, delivery times and weekly menu.',
    group: 'Catalogue',
    useAsTitle: 'title',
  },
  defaultSort: 'position',
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Plan',
          fields: [
            { name: 'title', type: 'text', label: 'Name', required: true, maxLength: 60, admin: { placeholder: 'Everyday Indian' } },
            {
              name: 'description',
              type: 'textarea',
              label: 'Short description',
              maxLength: 220,
              admin: { description: 'One or two lines on the plan card and at the top of its page.', rows: 3 },
            },
            {
              name: 'image',
              type: 'upload',
              label: 'Photo',
              relationTo: 'media',
              admin: { description: 'Shown on the plan card and in the cart. Leave empty for the branded placeholder.' },
            },
            {
              name: 'audience',
              type: 'relationship',
              label: 'Audience',
              relationTo: 'audiences',
              admin: { description: 'Who the plan is for, for example Kids. The list page can be filtered by it.' },
            },
            {
              name: 'meals',
              type: 'select',
              label: 'Meals offered',
              defaultValue: 'any',
              required: true,
              options: [
                { label: 'Lunch, dinner or both', value: 'any' },
                { label: 'Lunch only', value: 'lunch' },
                { label: 'Dinner only', value: 'dinner' },
              ],
              admin: { description: 'Lunch only suits a lunch-box plan, for example.' },
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
          label: 'Lengths and prices',
          fields: [
            {
              name: 'prices',
              type: 'array',
              label: 'Plan lengths',
              labels: { singular: 'Plan length', plural: 'Plan lengths' },
              minRows: 1,
              maxRows: 6,
              admin: {
                description:
                  'One row per plan length this plan is sold in, priced for one person. Fill the prices for the meals this plan offers; a length with no price for a meal choice is not offered for it.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'length', type: 'text', label: 'Name', required: true, maxLength: 30, validate: lengthName, admin: { width: '50%', placeholder: '2 weeks' } },
                    { name: 'days', type: 'number', label: 'Delivery days', required: true, min: 1, admin: { width: '25%', description: 'Mon–Sat, so 2 weeks is 12.' } },
                    { name: 'note', type: 'text', label: 'Tag', maxLength: 20, admin: { width: '25%', placeholder: 'Save 5%' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    rupeeField('lunchPrice', 'Lunch only (₹)'),
                    rupeeField('dinnerPrice', 'Dinner only (₹)'),
                    rupeeField('bothPrice', 'Lunch and dinner (₹)'),
                  ],
                },
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
                  'Each option is a pick-one choice, like Juice: Normal or Detox. The first choice is selected by default. Leave empty for a plan with no options.',
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
          label: 'Menu',
          description:
            'One fixed lunch and dinner per day. Write the main dish with its roti or rice, and the sides separated by commas. Update it each week.',
          fields: [menuWeekField('thisWeek', 'This week', 'The menu customers see on the plan page and its card.')],
        },
      ],
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      hooks: { beforeValidate: [autoSlug] },
      admin: {
        description: 'Left empty, it fills itself from the name. The plan page lives at /meal-subscription/<slug>.',
        position: 'sidebar',
      },
    },
    {
      name: 'position',
      type: 'number',
      label: 'Position',
      defaultValue: 0,
      admin: { description: 'Lower numbers come first on the list page.', position: 'sidebar' },
    },
  ],
  hooks: {
    afterChange: [revalidate],
  },
  labels: {
    plural: 'Meal plans',
    singular: 'Meal plan',
  },
  timestamps: true,
}
