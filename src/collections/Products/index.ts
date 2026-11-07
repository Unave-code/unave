import type { CollectionConfig, PayloadRequest } from 'payload'

import { anyone } from '../../access/anyone'
import { isStaff } from '../../access/isStaff'
import { CATEGORY_LABEL, PRODUCT_CATEGORY_VALUES } from '../../utilities/productsCategoryCopy'

import { revalidateProducts, revalidateProductsDelete } from './hooks/revalidateProducts'

/**
 * A product the kitchen sells on the site (spec 0007).
 *
 * A product is a duration of meals — a week, a month — paid once, upfront. Staff
 * own the catalogue: titles, images, prices and availability are all edited in
 * the admin, never in code. Anyone can read a product, because browsing is open
 * to everybody; only staff can change one.
 *
 * Prices are stored as integers in paise, the same unit the order rows and the
 * gateway speak, so no conversion ever happens on the way to a payment. The
 * admin shows and accepts rupees through the shared money field, which is the
 * only place the two units meet. Turning `available` off pauses a product: it
 * still renders on `/products` with a paused label, but it cannot enter a new
 * order.
 */
export const Products: CollectionConfig = {
  slug: 'products',
  access: {
    create: isStaff,
    delete: isStaff,
    read: anyone,
    update: isStaff,
  },
  admin: {
    defaultColumns: ['title', 'category', 'available', 'updatedAt'],
    description:
      'The meal products sold on the site. Turn `available` off to pause a product without deleting it; prices are entered and shown in rupees.',
    group: 'Store',
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      validate: (value: null | string | undefined) => {
        // Spec 0008, AC-7: the three category slugs are reserved, because
        // /products/<category> is a category page. A lowercase comparison so
        // "Ready-To-Cook" cannot slip past the rule either.
        if (typeof value !== 'string' || value.trim().length === 0) return true

        if ((PRODUCT_CATEGORY_VALUES as readonly string[]).includes(value.trim().toLowerCase())) {
          return 'This slug is reserved for the category pages. Add a word, for example "lunch-meal".'
        }

        return true
      },
      admin: {
        description:
          'Lowercase, with dashes instead of spaces. Anchors the product on /products and travels in checkout links.',
      },
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
          'Up to five short lines shown on the product card, under the description. For example "Delivered in an insulated tiffin".',
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
      name: 'image',
      type: 'upload',
      label: 'Image',
      relationTo: 'media',
      admin: {
        description:
          'The photo shown at the top of the product card on the shelf. Leave it empty and a branded placeholder is used instead.',
      },
    },
    {
      name: 'durations',
      type: 'array',
      label: 'Durations',
      required: true,
      admin: {
        description:
          'What a customer chooses: a label, how many days of meals it covers, and the price in rupees.',
      },
      fields: [
        {
          name: 'label',
          label: 'Label',
          type: 'text',
          required: true,
          admin: {
            description: 'Shown on the product card and at checkout, for example "One week".',
          },
        },
        {
          name: 'days',
          label: 'Days',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'price',
          label: 'Price (₹)',
          type: 'number',
          required: true,
          min: 1,
          admin: {
            components: {
              Field: '@/components/Admin/RupeeField#RupeeField',
            },
            description: 'What the customer pays for this duration, in rupees. 499 means ₹499.',
          },
        },
      ],
    },
    {
      name: 'category',
      type: 'select',
      label: 'Category',
      required: true,
      admin: {
        description: 'How the meal reaches the customer. Shown as a label on the product card.',
      },
      options: PRODUCT_CATEGORY_VALUES.map((value) => ({
        label: CATEGORY_LABEL[value],
        value,
      })),
    },
    {
      name: 'subcategory',
      type: 'relationship',
      label: 'Subcategory',
      relationTo: 'subcategories',
      // Deliberately not `required: true`. Payload turns a required relation
      // into a not-null column, and products that predate this revision have no
      // subcategory yet: a dev push would offer to truncate them. The column
      // stays nullable and the validate below refuses an empty save, so every
      // new or edited product must pick one while the old rows survive.
      required: false,
      index: true,
      admin: {
        description:
          'The finer label inside the category, for example "Breakfast". Only options of the chosen category are offered, and the category pages filter by them.',
      },
      filterOptions: ({ siblingData }) => {
        const category = (siblingData as { category?: null | string } | undefined)?.category

        return category ? { category: { equals: category } } : true
      },
      validate: async (
        value: unknown,
        { req, siblingData }: { req: PayloadRequest; siblingData: { category?: null | string } },
      ) => {
        if (!value) return 'Pick a subcategory for this product.'

        const id =
          typeof value === 'object' ? (value as { id?: number | string }).id : value

        if (typeof id !== 'number' && typeof id !== 'string') {
          return 'Pick a subcategory for this product.'
        }

        const selected = await req.payload
          .findByID({ collection: 'subcategories', id, depth: 0, overrideAccess: true })
          .catch(() => null)

        if (!selected) return 'That subcategory no longer exists. Pick another one.'

        const category = (siblingData as { category?: null | string } | undefined)?.category

        if (category && selected.category !== category) {
          return "Pick a subcategory from the product's own category."
        }

        return true
      },
    },
    {
      name: 'audience',
      type: 'select',
      label: 'Audience',
      required: true,
      admin: {
        description: 'Who the product is for. Shown as a label on the product card, next to the category.',
      },
      options: [
        { label: 'Kids', value: 'kids' },
        { label: 'Adults', value: 'adults' },
        { label: 'Special', value: 'special' },
      ],
    },
    {
      name: 'available',
      label: 'Available',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Off means the product shows a paused label and cannot be bought.',
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    afterChange: [revalidateProducts],
    afterDelete: [revalidateProductsDelete],
  },
  labels: {
    plural: 'Products',
    singular: 'Product',
  },
  timestamps: true,
}
