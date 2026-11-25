import type { PayloadRequest, Tab } from 'payload'

import { hasComboItems, isMealPlan, isSingleItem } from '../../../utilities/productKind'
import { validateCompareAtPrice } from '../validateCompareAtPrice'
import { type PricingData, soldBySize } from './pricing'

/** What it costs: durations for a meal plan, one price or sizes for an item, the items inside a combo. */
export const pricingTab: Tab = {
  label: 'Pricing',
  description:
    'What it costs. A meal plan is priced by duration; a single item or a combo has one price. Prices are in rupees.',
  fields: [
    {
      name: 'durations',
      type: 'array',
      label: 'Durations',
      admin: {
        condition: (data) => isMealPlan(data as PricingData),
        description:
          'What a customer chooses: a label, how many days of meals it covers, and the price in rupees. Shown when Meal plan is ticked.',
      },
      fields: [
        {
          name: 'label',
          label: 'Label',
          type: 'text',
          required: true,
          admin: {
            description:
              'Shown on the product card and at checkout, for example "One week".',
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
            description:
              'What the customer pays for this duration, in rupees. 499 means ₹499.',
          },
        },
      ],
      // Required for a meal plan, absent for a one-time purchase — which is
      // exactly the split the validate holds, since a static `required` would
      // block a one-time product from saving without rows it must not have.
      validate: (value: unknown, { siblingData }: { siblingData: PricingData }) => {
        if (!isMealPlan(siblingData)) return true

        if (!Array.isArray(value) || value.length === 0) {
          return 'Add at least one duration — a label, days and a price.'
        }

        // The cart, checkout and combos all find a duration by its label, so two
        // durations with the same label would make the choice ambiguous.
        const labels = value.map((row) =>
          String((row as { label?: unknown })?.label ?? '')
            .trim()
            .toLowerCase(),
        )
        const repeated = labels.find(
          (label, index) => label && labels.indexOf(label) !== index,
        )
        if (repeated) {
          return `Two durations are called "${repeated}". Give each duration its own label.`
        }

        if (
          value.some((row) => !Number.isInteger(Number((row as { days?: unknown })?.days)))
        ) {
          return 'Days must be a whole number, for example 5 or 22.'
        }

        return true
      },
    },
    {
      name: 'sizes',
      type: 'array',
      label: 'Sizes',
      labels: { plural: 'Sizes', singular: 'Size' },
      maxRows: 6,
      admin: {
        condition: (data) => isSingleItem(data as PricingData),
        description:
          'Optional. Sell this product in sizes, for example 250 g, 500 g and 1 kg, each with its own price. Leave empty to sell one size at the price below. The card leads with the cheapest size.',
        initCollapsed: false,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'label',
              label: 'Size',
              type: 'text',
              required: true,
              admin: { width: '34%', description: 'For example 500 g.' },
            },
            {
              name: 'price',
              label: 'Price (₹)',
              type: 'number',
              required: true,
              min: 1,
              admin: {
                width: '33%',
                components: {
                  Field: '@/components/Admin/RupeeField#RupeeField',
                },
              },
            },
            {
              name: 'compareAtPrice',
              label: 'Old price (₹)',
              type: 'number',
              min: 1,
              admin: {
                width: '33%',
                components: {
                  Field: '@/components/Admin/RupeeField#RupeeField',
                },
                description: 'Optional. Must be higher than the price.',
              },
              validate: (
                value: unknown,
                { siblingData }: { siblingData: { price?: null | number } },
              ) => validateCompareAtPrice(value, siblingData.price),
            },
          ],
        },
      ],
      validate: (value: unknown, { siblingData }: { siblingData: PricingData }) => {
        if (!isSingleItem(siblingData) || !Array.isArray(value)) return true

        // The cart finds a size by its label, so each must be distinct.
        const labels = value.map((row) =>
          String((row as { label?: unknown })?.label ?? '')
            .trim()
            .toLowerCase(),
        )
        const repeated = labels.find(
          (label, index) => label && labels.indexOf(label) !== index,
        )
        if (repeated) {
          return `Two sizes are called "${repeated}". Give each size its own name.`
        }
        if (labels.includes('one-time')) {
          return '"one-time" is reserved. Name the size by its weight or volume.'
        }

        return true
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'price',
          label: 'Price (₹)',
          type: 'number',
          min: 1,
          admin: {
            width: '33%',
            condition: (data) =>
              !isMealPlan(data as PricingData) && !soldBySize(data as PricingData),
            components: {
              Field: '@/components/Admin/RupeeField#RupeeField',
            },
            description:
              'The fixed price for one item or combo, in rupees. You can enter up to two decimal places.',
          },
          validate: (value: unknown, { siblingData }: { siblingData: PricingData }) => {
            if (isMealPlan(siblingData)) return true
            // A sized product takes its price from the cheapest size.
            if (soldBySize(siblingData)) return true

            if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
              return 'Enter a price with at most two decimal places.'
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
            width: '33%',
            condition: (data) =>
              isSingleItem(data as PricingData) && !soldBySize(data as PricingData),
            components: {
              Field: '@/components/Admin/RupeeField#RupeeField',
            },
            description:
              'Optional reference price for a single item. It must be higher than the current price.',
          },
          validate: (
            value: unknown,
            {
              siblingData,
            }: {
              siblingData: NonNullable<PricingData> & { price?: null | number }
            },
          ) => {
            if (!isSingleItem(siblingData) || soldBySize(siblingData)) return true

            return validateCompareAtPrice(value, siblingData.price)
          },
        },
        {
          name: 'packSize',
          label: 'Pack size',
          type: 'text',
          admin: {
            width: '33%',
            condition: (data) =>
              isSingleItem(data as PricingData) && !soldBySize(data as PricingData),
            description: 'Optional display text for a single item, for example 260 g.',
          },
        },
      ],
    },
    {
      name: 'components',
      type: 'array',
      label: 'Combo contents',
      minRows: 1,
      maxRows: 10,
      admin: {
        condition: (data) => hasComboItems(data as PricingData),
        description:
          'Choose one to ten different single items. Shown when Combo is ticked.',
      },
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: false,
          // Only single items go inside a combo.
          filterOptions: {
            type: { equals: 'one-time' },
          },
        },
        {
          name: 'productTitleSnapshot',
          type: 'text',
          admin: { hidden: true, readOnly: true },
        },
        {
          name: 'durationDaysSnapshot',
          type: 'number',
          admin: { hidden: true, readOnly: true },
        },
        {
          // From when a meal plan could sit inside a combo; kept so old
          // rows stay readable, never shown or set any more.
          name: 'durationLabel',
          type: 'text',
          admin: { hidden: true, readOnly: true },
        },
      ],
      validate: async (
        value: unknown,
        {
          req,
          siblingData,
        }: {
          req: PayloadRequest
          siblingData: NonNullable<PricingData> & { id?: number | string }
        },
      ) => {
        if (!hasComboItems(siblingData)) return true
        if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
          return 'Add between one and ten products to this combo.'
        }

        const ids = value.map((row) => {
          if (!row || typeof row !== 'object') return null
          const product = (row as { product?: unknown }).product
          return typeof product === 'object' && product !== null
            ? (product as { id?: unknown }).id
            : product
        })

        if (ids.some((id) => typeof id !== 'number' && typeof id !== 'string')) {
          return 'Choose a product for every combo row.'
        }
        if (new Set(ids.map(String)).size !== ids.length) {
          return 'Choose each product only once.'
        }
        if (
          siblingData.id !== undefined &&
          ids.some((id) => String(id) === String(siblingData.id))
        ) {
          return 'A combo cannot contain itself.'
        }

        const foundProducts = await req.payload.find({
          collection: 'products',
          depth: 0,
          limit: ids.length,
          overrideAccess: true,
          where: { id: { in: ids as (number | string)[] } },
        })
        const productsById = new Map(
          foundProducts.docs.map((product) => [String(product.id), product]),
        )

        for (let index = 0; index < ids.length; index += 1) {
          const product = productsById.get(String(ids[index]))

          if (!product || !isSingleItem(product)) {
            return 'Each combo row must be a single item, not a combo or a meal plan.'
          }
        }

        return true
      },
    },
    {
      name: 'addons',
      type: 'relationship',
      label: 'Add-ons',
      relationTo: 'addons',
      hasMany: true,
      maxRows: 6,
      admin: {
        // Single items and combos only: a meal plan prices by duration.
        condition: (data) => !isMealPlan(data as PricingData),
        description:
          'Optional extras a customer can tick under the price, such as almond milk or toast, in this order. Up to six. Create them under Catalogue → Add-ons.',
      },
    },
  ],
}
