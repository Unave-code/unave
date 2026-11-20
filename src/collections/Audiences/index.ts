import type { CollectionBeforeDeleteHook, CollectionConfig, FieldHook, Where } from 'payload'

import { APIError } from 'payload'

import { anyone } from '../../access/anyone'
import { isStaff } from '../../access/isStaff'
import { slugifyTitle } from '../Products/hooks/autoProductSlug'

/**
 * Who a product is for — Kids, Adults, Special, or whatever the kitchen adds.
 *
 * Staff keep this list in the admin, and every product picks one. The slug is
 * what the shelf filter carries in the address (`/products?audience=kids`), so
 * it fills itself from the title and stays unique.
 */

/** Fills an empty slug from the title, adding -2, -3 … when one is taken. */
const autoAudienceSlug: FieldHook = async ({ data, operation, originalDoc, req, value }) => {
  if (typeof value === 'string') {
    const typed = slugifyTitle(value)

    if (typed.length > 0) return typed
  }

  const source = (data as { title?: unknown } | undefined)?.title
  const previous = (originalDoc as { title?: unknown } | undefined)?.title
  const title = typeof source === 'string' ? source : typeof previous === 'string' ? previous : ''
  const base = slugifyTitle(title) || 'audience'
  const selfId =
    operation === 'update' ? (originalDoc as { id?: number | string } | undefined)?.id : undefined

  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`
    const where: Where =
      selfId === undefined
        ? { slug: { equals: candidate } }
        : { and: [{ slug: { equals: candidate } }, { id: { not_equals: selfId } }] }

    const clashes = await req.payload.find({
      collection: 'audiences',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where,
    })

    if (clashes.docs.length === 0) return candidate
  }
}

/**
 * An audience still chosen by a product cannot be deleted: the relation column
 * is `ON DELETE set null`, which would quietly leave those products without one.
 */
const denyDeleteInUse: CollectionBeforeDeleteHook = async ({ id, req: { payload } }) => {
  const inUse = await payload.count({
    collection: 'products',
    overrideAccess: true,
    where: { audience: { equals: id } },
  })

  if (inUse.totalDocs > 0) {
    throw new APIError(
      `This audience is still used by ${inUse.totalDocs} product${
        inUse.totalDocs === 1 ? '' : 's'
      }. Give those products another audience first, then delete this one.`,
      400,
    )
  }

  const plans = await payload.count({
    collection: 'meal-plans',
    overrideAccess: true,
    where: { audience: { equals: id } },
  })

  if (plans.totalDocs > 0) {
    throw new APIError(
      `This audience is still used by ${plans.totalDocs} meal plan${
        plans.totalDocs === 1 ? '' : 's'
      }. Give those meal plans another audience first, then delete this one.`,
      400,
    )
  }
}

export const Audiences: CollectionConfig = {
  slug: 'audiences',
  access: {
    create: isStaff,
    delete: isStaff,
    read: anyone,
    update: isStaff,
  },
  admin: {
    defaultColumns: ['title', 'slug', 'position', 'updatedAt'],
    description:
      'Who a product is for, for example Kids or Adults. Every product picks one, and shoppers can filter the products page by it.',
    group: 'Catalogue',
    useAsTitle: 'title',
  },
  defaultSort: 'position',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Name',
      required: true,
      admin: {
        description: 'Shown on the product page and in the products filter, for example "Kids".',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      hooks: {
        beforeValidate: [autoAudienceSlug],
      },
      admin: {
        description:
          'Left empty, it fills itself from the name. It is the word the products filter puts in the web address.',
        position: 'sidebar',
      },
    },
    {
      name: 'position',
      type: 'number',
      label: 'Position',
      defaultValue: 0,
      admin: {
        description: 'Lower numbers come first in the products filter.',
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeDelete: [denyDeleteInUse],
  },
  labels: {
    plural: 'Audiences',
    singular: 'Audience',
  },
  timestamps: true,
}
