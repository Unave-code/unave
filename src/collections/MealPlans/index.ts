import type { CollectionAfterChangeHook, CollectionConfig, FieldHook, TextFieldSingleValidation, Where } from 'payload'

import { revalidatePath } from 'next/cache'

import { anyone } from '../../access/anyone'
import { isStaff } from '../../access/isStaff'
import { menuWeekField, rupeeField } from '../../globals/PlanBuilder/fields'
import { slugifyTitle } from '../Products/hooks/autoProductSlug'

/**
 * The meal plans sold on /meal-subscription, each on its own page at
 * /meal-subscription/<slug>: its own weekly menu, its own price for each plan
 * length, a photo and a short description. Plan lengths, options and delivery
 * times are shared, in Catalogue → Meal plan settings.
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

/** A price row must name one of the shared plan lengths exactly. */
const knownLength: TextFieldSingleValidation = async (value, { req }) => {
  if (!value) return 'Pick the plan length this price is for.'
  const settings = await req.payload.findGlobal({ slug: 'plan-builder', depth: 0, overrideAccess: true })
  const labels = (settings?.plans ?? []).map((p) => String(p?.label ?? '').trim())
  if (labels.some((label) => label.toLowerCase() === value.trim().toLowerCase())) return true
  return `Use one of the plan lengths from Meal plan settings: ${labels.join(', ') || 'none set yet'}.`
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
      'Each meal plan has its own page on /meal-subscription with its weekly menu and prices. Plan lengths and options are shared, in Meal plan settings.',
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
          ],
        },
        {
          label: 'Prices',
          fields: [
            {
              name: 'prices',
              type: 'array',
              label: 'Prices',
              labels: { singular: 'Price', plural: 'Prices' },
              minRows: 1,
              maxRows: 6,
              admin: {
                description:
                  'One row per plan length, for one person. Fill the prices for the meals this plan offers; a length with no price for a meal choice is not offered for it.',
              },
              fields: [
                { name: 'length', type: 'text', label: 'Plan length', required: true, validate: knownLength, admin: { placeholder: '2 weeks' } },
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
          label: 'Menu',
          description:
            'One fixed lunch and dinner per day. Write the main dish with its roti or rice, and the sides separated by commas. Each week, copy next week into this week and write the new next week.',
          fields: [
            menuWeekField('thisWeek', 'This week', 'The menu customers see first.'),
            menuWeekField('nextWeek', 'Next week', 'Shown on the Next week switch. Leave empty to hide the switch.'),
          ],
        },
        {
          label: 'Notice',
          fields: [
            { name: 'noticeTitle', type: 'text', label: 'Notice heading', defaultValue: 'Cooking around a health need?' },
            {
              name: 'noticeBody',
              type: 'textarea',
              label: 'Notice text',
              defaultValue:
                "Tell us about allergies, diabetes or a diet your doctor gave you in the order note. We cook to your notes, but our meals are not medical treatment and we can't promise any result.",
              admin: { description: 'Required near any medical, allergy, diabetes or child-nutrition claim. Leave both empty to hide.' },
            },
          ],
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
