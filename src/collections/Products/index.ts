import type { CollectionConfig, PayloadRequest } from 'payload'

import { anyone } from '../../access/anyone'
import { isStaff } from '../../access/isStaff'
import { CATEGORY_LABEL, PRODUCT_CATEGORY_VALUES } from '../../utilities/productsCategoryCopy'

import { revalidateProducts, revalidateProductsDelete } from './hooks/revalidateProducts'
import { autoProductSlug } from './hooks/autoProductSlug'
import { setLeadPrice } from './hooks/leadPrice'
import { validateCompareAtPrice } from './validateCompareAtPrice'

/**
 * A product the kitchen sells on the site (spec 0007).
 *
 * A product is either a meal plan — a duration of meals, a week or a month,
 * paid once, upfront — or a one-time purchase: a single food item with one
 * price, bought in a quantity of one to ten. The `type` field decides which,
 * and it decides the shape below it: a plan carries durations, a one-time
 * purchase carries a single price, and each hides the other in the admin.
 * Staff own the catalogue: titles, images, prices and availability are all
 * edited in the admin, never in code. Anyone can read a product, because
 * browsing is open to everybody; only staff can change one.
 *
 * Prices are stored as integers in paise, the same unit the order rows and the
 * gateway speak, so no conversion ever happens on the way to a payment. The
 * admin shows and accepts rupees through the shared money field, which is the
 * only place the two units meet. Turning `available` off pauses a product: it
 * still renders on `/products` with a paused label, but it cannot enter a new
 * order. Turning `featured` on puts a product at the front of the homepage
 * shelf, so staff choose what the front page leads with instead of relying on
 * whatever was added last.
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
    defaultColumns: ['title', 'category', 'available', 'featured', 'updatedAt'],
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
      // The slug fills itself from the title when left empty, so the kitchen
      // never has to invent one. The validate below still guards the rule the
      // hook obeys too: a generated slug that would land on a category page
      // gains a suffix instead of saving.
      hooks: {
        beforeValidate: [autoProductSlug],
      },
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
          'Left empty, it fills itself from the title: lowercase, dashes instead of spaces. It anchors the product on /products and travels in checkout links, so changing it moves the page.',
      },
    },
    {
      name: 'type',
      type: 'select',
      label: 'Type',
      required: true,
      defaultValue: 'plan',
      admin: {
        description:
          'A meal plan is bought as a duration — a week, a month — chosen at checkout. A one-time purchase is a single item with one price and no durations, bought in a quantity of one to ten.',
      },
      options: [
        { label: 'Meal plan', value: 'plan' },
        { label: 'One-time purchase', value: 'one-time' },
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
      admin: {
        condition: (data) => (data as { type?: null | string } | undefined)?.type !== 'one-time',
        description:
          'What a customer chooses: a label, how many days of meals it covers, and the price in rupees. Hidden on a one-time purchase, which has no durations.',
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
      // Required for a meal plan, absent for a one-time purchase — which is
      // exactly the split the validate holds, since a static `required` would
      // block a one-time product from saving without rows it must not have.
      validate: (
        value: unknown,
        { siblingData }: { siblingData: { type?: null | string } },
      ) => {
        const type = siblingData.type

        if (type === 'one-time') return true

        if (!Array.isArray(value) || value.length === 0) {
          return 'Add at least one duration — a label, days and a price.'
        }

        return true
      },
    },
    {
      name: 'price',
      label: 'Price (₹)',
      type: 'number',
      min: 1,
      admin: {
        condition: (data) => (data as { type?: null | string } | undefined)?.type === 'one-time',
        components: {
          Field: '@/components/Admin/RupeeField#RupeeField',
        },
        description:
          'What one item costs, in rupees. 499 means ₹499. Shown on a one-time purchase only.',
      },
      validate: (
        value: unknown,
        { siblingData }: { siblingData: { type?: null | string } },
      ) => {
        const type = siblingData.type

        if (type !== 'one-time') return true

        if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
          return 'Enter the price for one item, in rupees.'
        }

        return true
      },
    },
    {
      name: 'compareAtPrice',
      label: 'Old price (₹)',
      type: 'number',
      min: 1,
      admin: {
        condition: (data) => (data as { type?: null | string } | undefined)?.type === 'one-time',
        components: {
          Field: '@/components/Admin/RupeeField#RupeeField',
        },
        description:
          'Optional reference price for a one-time product. It must be higher than the current price.',
      },
      validate: (
        value: unknown,
        { siblingData }: { siblingData: { price?: null | number; type?: null | string } },
      ) => {
        if (siblingData.type !== 'one-time') return true

        return validateCompareAtPrice(value, siblingData.price)
      },
    },
    {
      name: 'packSize',
      label: 'Pack size',
      type: 'text',
      admin: {
        condition: (data) => (data as { type?: null | string } | undefined)?.type === 'one-time',
        description: 'Optional display text for a one-time product, for example 260 g.',
      },
    },
    {
      name: 'fromPrice',
      label: 'Lead price (paise)',
      type: 'number',
      index: true,
      admin: {
        description:
          'Derived on every save: the cheapest per-day rate for a plan, the item price for a one-time purchase, in paise. The shelf sorts and filters on it, so it is never edited by hand.',
        position: 'sidebar',
        readOnly: true,
      },
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
    {
      name: 'featured',
      label: 'Featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'On puts this product on the homepage shelf first. Paused products are never shown there, and if fewer than four are featured the newest open products fill the rest.',
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    afterChange: [revalidateProducts],
    afterDelete: [revalidateProductsDelete],
    beforeChange: [setLeadPrice],
  },
  labels: {
    plural: 'Products',
    singular: 'Product',
  },
  timestamps: true,
}
