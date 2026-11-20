import type { PayloadRequest, Tab } from 'payload'

import { CATEGORY_LABEL, PRODUCT_CATEGORY_VALUES } from '../../../utilities/productsCategoryCopy'

/** Where it sits on the site: category, subcategory and audience. */
export const shelfTab: Tab = {
  label: 'Shelf',
  description:
    'Where it sits on the site: the category page, the subcategory filter and who it is for.',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'category',
          type: 'select',
          label: 'Category',
          required: true,
          admin: {
            width: '33%',
            description:
              'How the meal reaches the customer. Shown as a label on the product card.',
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
            width: '33%',
            description:
              'The finer label inside the category, for example "Breakfast". Only options of the chosen category are offered, and the category pages filter by them.',
          },
          filterOptions: ({ siblingData }) => {
            const category = (siblingData as { category?: null | string } | undefined)
              ?.category

            return category ? { category: { equals: category } } : true
          },
          validate: async (
            value: unknown,
            {
              req,
              siblingData,
            }: { req: PayloadRequest; siblingData: { category?: null | string } },
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

            const category = (siblingData as { category?: null | string } | undefined)
              ?.category

            if (category && selected.category !== category) {
              return "Pick a subcategory from the product's own category."
            }

            return true
          },
        },
        {
          name: 'audience',
          type: 'relationship',
          label: 'Audience',
          relationTo: 'audiences',
          // Nullable in the database, like the subcategory, so a product is
          // never truncated by a schema push; the validate below still makes
          // every save pick one.
          required: false,
          index: true,
          admin: {
            width: '33%',
            description:
              'Who the product is for. Manage the list under Catalogue → Audiences.',
          },
          validate: (value: unknown) =>
            value ? true : 'Pick an audience for this product.',
        },
      ],
    },
  ],
}
