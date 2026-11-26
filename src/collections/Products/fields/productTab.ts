import type { Tab } from 'payload'

import { isMealPlan } from '../../../utilities/productKind'
import { type PricingData } from './pricing'

/** What the customer reads: the name, the kind of product, the photo and the words under it. */
export const productTab: Tab = {
  label: 'Product',
  description:
    'What the customer reads: the name, the kind of product, the photo and the words under it.',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      hooks: {
        /* A stray space at the end of a name ("Chettinad Veg Crunch Sandwich ")
           printed as "Name  | UNAVE" in the page title. Trim the ends and fold
           runs of spaces before the title is saved or slugified. */
        beforeValidate: [
          ({ value }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value),
        ],
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'combo',
          type: 'checkbox',
          label: 'Combo',
          defaultValue: false,
          admin: {
            width: '50%',
            description:
              'Tick to put other products inside this one. Choose them under Pricing → Combo contents.',
          },
        },
        {
          name: 'mealPlan',
          type: 'checkbox',
          label: 'Meal plan',
          defaultValue: false,
          admin: {
            width: '50%',
            description:
              'Tick to sell it by duration, for example One week or One month, each with its own price.',
          },
        },
      ],
    },
    {
      // Worked out from the two ticks on every save (deriveProductKind):
      // plan when Meal plan is ticked, combo when only Combo is, one-time
      // otherwise. The cart, checkout and shelf read it for pricing.
      name: 'type',
      type: 'select',
      label: 'Kind',
      required: true,
      defaultValue: 'one-time',
      admin: { hidden: true },
      options: [
        { label: 'Meal plan', value: 'plan' },
        { label: 'Single item', value: 'one-time' },
        { label: 'Meal combo', value: 'combo' },
      ],
    },
    {
      name: 'image',
      type: 'upload',
      label: 'Image',
      relationTo: 'media',
      admin: {
        description:
          'The main photo: first on the product card and the product page. A combo also shows it in its gallery. Leave it empty and a branded placeholder is used instead.',
      },
    },
    {
      name: 'gallery',
      type: 'array',
      label: 'More photos',
      labels: { plural: 'Photos', singular: 'Photo' },
      maxRows: 4,
      admin: {
        description:
          'Up to four more photos, so a product shows five in all. They follow the main photo on the product page, in this order, and the first one shows when a shopper points at the product card.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          label: 'Photo',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'description',
      type: 'richText',
      label: 'Description',
    },
    {
      name: 'points',
      type: 'array',
      label: 'Points',
      maxRows: 5,
      admin: {
        description:
          'Up to five short lines shown on the product page under What you get, and matched by the shop search. For example "Delivered in an insulated tiffin".',
      },
      fields: [
        {
          name: 'point',
          label: 'Point',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'benefits',
      type: 'array',
      label: 'Benefits',
      labels: { plural: 'Benefits', singular: 'Benefit' },
      maxRows: 6,
      admin: {
        description:
          'Up to six cards shown on the product page under Benefits, each with a short title and one line. For example "Gut health" — "Fermented the slow way, easy on the stomach."',
      },
      fields: [
        {
          name: 'icon',
          type: 'select',
          label: 'Icon',
          // No longer shown on the page; kept so stored rows stay valid.
          admin: { hidden: true },
          defaultValue: 'leaf',
          required: true,
          options: [
            { label: 'Leaf', value: 'leaf' },
            { label: 'Heart', value: 'heart' },
            { label: 'Sparkles', value: 'sparkles' },
            { label: 'Shield', value: 'shield' },
            { label: 'Wheat', value: 'wheat' },
            { label: 'Sun', value: 'sun' },
            { label: 'Droplet', value: 'droplet' },
            { label: 'Flame', value: 'flame' },
            { label: 'Sprout', value: 'sprout' },
            { label: 'Apple', value: 'apple' },
            { label: 'Energy', value: 'zap' },
            { label: 'Cooking pot', value: 'cooking-pot' },
          ],
        },
        {
          name: 'title',
          type: 'text',
          label: 'Title',
          required: true,
          maxLength: 40,
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'One line',
          maxLength: 140,
        },
      ],
    },
    {
      name: 'howItWorks',
      type: 'textarea',
      label: 'How your plan works (this plan only)',
      admin: {
        condition: (data) => isMealPlan(data as PricingData),
        description:
          'Optional. Replaces the shared text (Catalogue → Product page) on this plan’s page only. One step per line. Leave empty to use the shared text.',
        rows: 5,
      },
    },
  ],
}
