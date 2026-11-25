import type { CollectionBeforeDeleteHook, CollectionConfig } from 'payload'

import { APIError } from 'payload'

import { anyone } from '../../access/anyone'
import { isStaff } from '../../access/isStaff'

/** Refuses to delete an add-on a product still offers; the relation would quietly drop it otherwise. */
const denyDeleteInUse: CollectionBeforeDeleteHook = async ({ id, req: { payload } }) => {
  const inUse = await payload.count({
    collection: 'products',
    overrideAccess: true,
    where: { addons: { contains: id } },
  })

  if (inUse.totalDocs > 0) {
    throw new APIError(
      `This add-on is still offered on ${inUse.totalDocs} product${
        inUse.totalDocs === 1 ? '' : 's'
      }. Remove it from those products first, or turn Available off to pause it.`,
      400,
    )
  }
}

/**
 * Optional extras a customer can tick on a single item or a combo, such as
 * almond milk or toast (docs/addons/product-addons-flow.pdf).
 *
 * One record is shared by every product that offers it, so staff change its
 * price or pause it in one place. An add-on is never sold on its own: it has no
 * page, never sits on the shelf and only reaches a cart beside a product that
 * offers it. Prices are paise, entered and shown as rupees.
 */
export const Addons: CollectionConfig = {
  slug: 'addons',
  access: {
    create: isStaff,
    delete: isStaff,
    read: anyone,
    update: isStaff,
  },
  admin: {
    defaultColumns: ['title', 'note', 'price', 'available', 'updatedAt'],
    description:
      'Optional extras a customer can tick on a single item or a combo, such as almond milk or toast. Attach them to a product on its Pricing tab. Turn Available off to pause one everywhere.',
    group: 'Catalogue',
    useAsTitle: 'title',
  },
  defaultSort: 'title',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Name',
          required: true,
          maxLength: 40,
          admin: { placeholder: 'Almond milk', width: '50%' },
        },
        {
          name: 'note',
          type: 'text',
          label: 'Short note',
          maxLength: 30,
          admin: { description: 'Optional. Shown beside the name.', placeholder: '200 ml', width: '50%' },
        },
      ],
    },
    {
      name: 'price',
      type: 'number',
      label: 'Price (₹)',
      required: true,
      min: 1,
      admin: {
        components: {
          Cell: '@/components/Admin/RupeeCell#RupeeCell',
          Field: '@/components/Admin/RupeeField#RupeeField',
        },
        description: 'Added to the product price for each one bought. 40 means ₹40.',
      },
      validate: (value: unknown) =>
        typeof value === 'number' && Number.isSafeInteger(value) && value >= 1
          ? true
          : 'Enter a price with at most two decimal places.',
    },
    {
      name: 'available',
      type: 'checkbox',
      label: 'Available',
      defaultValue: true,
      admin: {
        description: 'Turn off to stop offering this add-on on every product, without removing it.',
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeDelete: [denyDeleteInUse],
  },
  labels: {
    plural: 'Add-ons',
    singular: 'Add-on',
  },
  timestamps: true,
}
