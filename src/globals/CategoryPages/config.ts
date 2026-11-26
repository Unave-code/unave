import { isStaff } from '@/access/isStaff'
import type { Field, GlobalAfterChangeHook, GlobalConfig } from 'payload'

import { revalidateTag } from 'next/cache'

import { CATEGORY_LABEL } from '../../utilities/productsCategoryCopy'

const revalidateCategoryPages: GlobalAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) {
    // Outside a Next request (a script) there is no cache to clear; never fail the write for it.
    try {
      revalidateTag('global_category-pages', 'max')
    } catch {
      payload.logger.warn('Could not revalidate the category pages cache outside a Next request context')
    }
  }
  return doc
}

const headerImage = (name: string, label: string, path: string): Field => ({
  name,
  type: 'upload',
  label,
  relationTo: 'media',
  admin: {
    description: `The photo beside the heading on ${path}. Leave empty for a text-only header.`,
  },
})

/** The photos at the top of the three product category pages. */
export const CategoryPages: GlobalConfig = {
  slug: 'category-pages',
  label: 'Category pages',
  access: {
    read: () => true,
    // Without this Payload lets any signed in user, customers included, edit it.
    update: isStaff,
  },
  admin: {
    description: 'The header photo on each product category page. Give each Media item descriptive alt text.',
    group: 'Website',
  },
  fields: [
    headerImage('readyToEat', CATEGORY_LABEL['ready-to-eat'], '/products/ready-to-eat'),
    headerImage('readyToCook', CATEGORY_LABEL['ready-to-cook'], '/products/ready-to-cook'),
    headerImage('freshFromProduce', CATEGORY_LABEL['fresh-from-produce'], '/products/fresh-from-produce'),
  ],
  hooks: {
    afterChange: [revalidateCategoryPages],
  },
}
