import type { CollectionConfig } from 'payload'

import { anyone } from '../../access/anyone'
import { isStaff } from '../../access/isStaff'
import { CATEGORY_LABEL, PRODUCT_CATEGORY_VALUES } from '../../utilities/productsCategoryCopy'

import { denyDeleteInUse } from './hooks/denyDeleteInUse'

/**
 * The finer labels inside a product category (spec 0008, AC-8).
 *
 * Ready to cook might split into breakfast and lunch; ready to eat into tiffin
 * and dessert. The kitchen owns the list and edits it in the admin, so a new
 * grouping never needs a developer. Each option belongs to exactly one
 * category, and the picker on a product offers only the options of that
 * product's own category.
 *
 * There is no slug field: nothing public addresses a subcategory on its own.
 * The document id is the identity, which is also why two categories can each
 * carry an option with the same name.
 */
export const Subcategories: CollectionConfig = {
  slug: 'subcategories',
  access: {
    create: isStaff,
    delete: isStaff,
    read: anyone,
    update: isStaff,
  },
  admin: {
    defaultColumns: ['title', 'category', 'updatedAt'],
    description:
      'The finer labels inside each product category. Products pick one from their own category, and the category pages filter by them.',
    group: 'Store',
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'The filter label, for example "Breakfast" or "Tiffin".',
      },
    },
    {
      name: 'category',
      type: 'select',
      label: 'Category',
      required: true,
      admin: {
        description: 'Which shelf this option belongs to. A product can only pick options from its own category.',
      },
      options: PRODUCT_CATEGORY_VALUES.map((value) => ({
        label: CATEGORY_LABEL[value],
        value,
      })),
    },
  ],
  hooks: {
    // A subcategory still chosen by a product cannot be deleted, because that
    // would leave the product without the label its category page filters on.
    beforeDelete: [denyDeleteInUse],
  },
  labels: {
    plural: 'Subcategories',
    singular: 'Subcategory',
  },
  timestamps: true,
}
