import type { CollectionAfterChangeHook, CollectionBeforeValidateHook, CollectionConfig, FieldHook, PayloadRequest, TextFieldSingleValidation, Where } from 'payload'

import { revalidatePath } from 'next/cache'
import { ValidationError } from 'payload'

import { anyone } from '../../access/anyone'
import { isStaff } from '../../access/isStaff'
import { menuWeekField, rupeeField } from './fields'
import { slugifyTitle } from '../Products/hooks/autoProductSlug'
import { MEAL_LABEL, MEALS_OFFERED, type MealsOffered, TRIAL_DAYS, unpricedMeals } from '../../utilities/planBuilder'
import { CATEGORY_LABEL, PRODUCT_CATEGORY_VALUES } from '../../utilities/productsCategoryCopy'

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

/**
 * Every meal the plan offers needs a price on at least one length, or the site
 * quietly hides it: a breakfast menu with no breakfast price never shows.
 */
const offeredMealsPriced: CollectionBeforeValidateHook = ({ collection, data, originalDoc, req }) => {
  const raw = data?.meals ?? originalDoc?.meals
  const meals: MealsOffered = MEALS_OFFERED.includes(raw) ? raw : 'any'
  const missing = unpricedMeals(meals, data?.prices ?? originalDoc?.prices)
  if (missing.length === 0) return data
  const names = missing.map((meal) => MEAL_LABEL[meal])
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  throw new ValidationError(
    {
      collection: collection.slug,
      errors: [
        {
          message: `This plan offers ${list.toLowerCase()}, but no plan length has a price for ${missing.length === 1 ? 'it' : 'them'}. Fill the ${list} price on at least one length, or change Meals offered.`,
          path: 'prices',
        },
      ],
    },
    req.t,
  )
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
              type: 'row',
              fields: [
                {
                  name: 'category',
                  type: 'select',
                  label: 'Category',
                  defaultValue: 'ready-to-eat',
                  options: PRODUCT_CATEGORY_VALUES.map((value) => ({ label: CATEGORY_LABEL[value], value })),
                  admin: { width: '50%', description: 'Narrows the subcategories offered beside it.' },
                },
                {
                  name: 'subcategory',
                  type: 'relationship',
                  label: 'Subcategory',
                  relationTo: 'subcategories',
                  index: true,
                  admin: {
                    width: '50%',
                    description: 'For example Lunch. The meal plans page offers one tile per subcategory a plan uses.',
                  },
                  filterOptions: ({ siblingData }) => {
                    const category = (siblingData as { category?: null | string } | undefined)?.category
                    return category ? { category: { equals: category } } : true
                  },
                  validate: async (value: unknown, { req, siblingData }: { req: PayloadRequest; siblingData: { category?: null | string } }) => {
                    if (!value) return true
                    const id = typeof value === 'object' ? (value as { id?: number | string }).id : value
                    if (typeof id !== 'number' && typeof id !== 'string') return true
                    const selected = await req.payload
                      .findByID({ collection: 'subcategories', id, depth: 0, overrideAccess: true })
                      .catch(() => null)
                    if (!selected) return 'That subcategory no longer exists. Pick another one.'
                    if (siblingData?.category && selected.category !== siblingData.category) {
                      return "Pick a subcategory from the plan's own category."
                    }
                    return true
                  },
                },
              ],
            },
            {
              name: 'meals',
              type: 'select',
              label: 'Meals offered',
              defaultValue: 'any',
              required: true,
              options: [
                { label: 'Breakfast, lunch and dinner', value: 'any' },
                { label: 'Breakfast and lunch', value: 'breakfast-lunch' },
                { label: 'Breakfast and dinner', value: 'breakfast-dinner' },
                { label: 'Lunch and dinner', value: 'lunch-dinner' },
                { label: 'Breakfast only', value: 'breakfast' },
                { label: 'Lunch only', value: 'lunch' },
                { label: 'Dinner only', value: 'dinner' },
              ],
              admin: {
                description:
                  'The meals customers can pick from; they can take one or any mix of them. Lunch only suits a lunch-box plan, for example. Customers see each offered meal that has a price under Lengths and prices.',
              },
            },
            {
              type: 'row',
              fields: [
                { name: 'breakfastTime', type: 'text', label: 'Breakfast delivery time', defaultValue: '7:00 – 8:30 AM', admin: { width: '33%' } },
                { name: 'lunchTime', type: 'text', label: 'Lunch delivery time', defaultValue: '12:00 – 1:30 PM', admin: { width: '33%' } },
                { name: 'dinnerTime', type: 'text', label: 'Dinner delivery time', defaultValue: '7:00 – 8:30 PM', admin: { width: '33%' } },
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
                    {
                      name: 'days',
                      type: 'number',
                      label: 'Delivery days',
                      required: true,
                      min: 1,
                      // A trial always runs TRIAL_DAYS days, whatever was typed.
                      hooks: { beforeValidate: [({ siblingData, value }) => ((siblingData as { trial?: boolean })?.trial ? TRIAL_DAYS : value)] },
                      admin: {
                        width: '25%',
                        description: 'Mon–Sat, so 2 weeks is 12. A trial is always 3.',
                        condition: (_, siblingData) => !(siblingData as { trial?: boolean })?.trial,
                      },
                    },
                    { name: 'note', type: 'text', label: 'Tag', maxLength: 20, admin: { width: '25%', placeholder: 'Save 5%' } },
                  ],
                },
                {
                  name: 'trial',
                  type: 'checkbox',
                  label: '3-day trial',
                  defaultValue: false,
                  admin: {
                    description: 'A short trial length: it runs 3 delivery days, and the plan page shows only those 3 days of the menu.',
                  },
                },
                {
                  type: 'row',
                  fields: [
                    rupeeField('lunchPrice', 'Lunch only (₹)'),
                    rupeeField('dinnerPrice', 'Dinner only (₹)'),
                    rupeeField('bothPrice', 'Lunch and dinner (₹)'),
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    rupeeField('breakfastPrice', 'Breakfast (₹)', {
                      admin: {
                        width: '33%',
                        description:
                          'Breakfast on its own, and what it adds on top of a lunch or dinner choice. Leave empty if this length has no breakfast.',
                        components: { Field: '@/components/Admin/RupeeField#RupeeField' },
                      },
                    }),
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
                  'Each option is a group of add-ons, like Juice: Normal or Detox. Customers can pick any number of them, or none. Leave empty for a plan with no add-ons.',
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
                  minRows: 1,
                  maxRows: 6,
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
            'One fixed breakfast, lunch and dinner per day; leave a meal empty if the plan does not serve it. Write the main dish with its roti, rice or dosa, and the sides separated by commas. Update it each week.',
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
    beforeValidate: [offeredMealsPriced],
  },
  labels: {
    plural: 'Meal plans',
    singular: 'Meal plan',
  },
  timestamps: true,
}
