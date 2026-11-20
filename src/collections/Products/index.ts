import type { CollectionConfig } from 'payload'

import { anyone } from '../../access/anyone'
import { isStaff } from '../../access/isStaff'

import { pricingTab } from './fields/pricingTab'
import { productTab } from './fields/productTab'
import { shelfTab } from './fields/shelfTab'
import { sidebarFields } from './fields/sidebarFields'
import { revalidateProducts, revalidateProductsDelete } from './hooks/revalidateProducts'
import { deriveProductKind } from './hooks/deriveProductKind'
import { setLeadPrice } from './hooks/leadPrice'
import { normalizeProductShape } from './hooks/normalizeProductShape'
import { prepareComboComponents } from './hooks/prepareComboComponents'


/**
 * A product the kitchen sells on the site (spec 0007).
 *
 * Two ticks decide its shape. **Combo** puts single items inside it; **Meal
 * plan** sells it by duration — a week or a month, paid once, upfront — each
 * with its own price. Neither makes it a single item with one price (or
 * sizes), bought in a quantity of one to ten. Both make a meal plan that lists
 * what it includes. The hidden `type` is worked out from the ticks on every
 * save (`deriveProductKind`) and is what the cart and checkout price by.
 * Staff own the catalogue: titles, images, prices and availability are all
 * edited in the admin, never in code. Anyone can read a product, because
 * browsing is open to everybody; only staff can change one.
 *
 * Prices are stored as integers in paise, the same unit the order rows and the
 * gateway speak, so no conversion ever happens on the way to a payment. The
 * admin shows and accepts rupees through the shared money field, which is the
 * only place the two units meet. Turning `available` off pauses a product: it
 * disappears from the site (shelf, related products, its own page and the
 * sitemap) and cannot enter a new order. Turning `featured` on puts a product at the front of the homepage
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
    defaultColumns: [
      'image',
      'title',
      'mealPlan',
      'combo',
      'category',
      'fromPrice',
      'available',
      'featured',
      'updatedAt',
    ],
    description:
      'The meal products sold on the site. Turn Available off to hide a product from the site without deleting it. Prices are entered and shown in rupees.',
    group: 'Catalogue',
    listSearchableFields: ['title', 'slug'],
    pagination: { defaultLimit: 25 },
    // Opens the product's own page on the site, so a change can be checked
    // where customers will see it.
    preview: (data) =>
      typeof data?.slug === 'string' && data.slug ? `/products/${data.slug}` : null,
    useAsTitle: 'title',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [productTab, pricingTab, shelfTab],
    },
    ...sidebarFields,
  ],
  hooks: {
    afterChange: [revalidateProducts],
    afterDelete: [revalidateProductsDelete],
    beforeChange: [normalizeProductShape, prepareComboComponents, setLeadPrice],
    beforeValidate: [deriveProductKind],
  },
  labels: {
    plural: 'Products',
    singular: 'Product',
  },
  timestamps: true,
}
