import type { CollectionConfig } from 'payload'

import { anyone } from '../../access/anyone'
import { isStaff } from '../../access/isStaff'
import { CATEGORY_LABEL, PRODUCT_CATEGORY_VALUES } from '../../utilities/productsCategoryCopy'

import { autoSubcategorySlug } from './hooks/autoSubcategorySlug'
import { denyDeleteInUse } from './hooks/denyDeleteInUse'
import {
  revalidateSubcategories,
  revalidateSubcategoriesDelete,
} from './hooks/revalidateSubcategories'

/**
 * The finer labels inside a product category (spec 0008, AC-8). Their unique
 * slugs also identify the server-side shelf filter (assumed spec 0009).
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
    defaultColumns: ['title', 'slug', 'category', 'updatedAt'],
    description:
      'Manage product labels by category. Subcategories can have an optional image and an automatically generated slug.',
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
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      hooks: {
        beforeValidate: [autoSubcategorySlug],
      },
      admin: {
        description:
          'Generated from the title when empty. Entered values are normalized.',
      },
    },
    {
      name: 'category',
      type: 'select',
      label: 'Category',
      required: true,
      admin: {
        description:
          'Which shelf this option belongs to. A product can only pick options from its own category.',
      },
      options: PRODUCT_CATEGORY_VALUES.map((value) => ({
        label: CATEGORY_LABEL[value],
        value,
      })),
    },
    {
      name: 'image',
      type: 'upload',
      label: 'Image',
      relationTo: 'media',
      admin: {
        description: 'Optional image for this subcategory.',
      },
    },
  ],
  hooks: {
    // A subcategory still chosen by a product cannot be deleted, because that
    // would leave the product without the label its category page filters on.
    afterChange: [revalidateSubcategories],
    afterDelete: [revalidateSubcategoriesDelete],
    beforeDelete: [denyDeleteInUse],
  },
  labels: {
    plural: 'Subcategories',
    singular: 'Subcategory',
  },
  timestamps: true,
}
