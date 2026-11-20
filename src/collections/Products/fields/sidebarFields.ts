import type { Field } from 'payload'

import { PRODUCT_CATEGORY_VALUES } from '../../../utilities/productsCategoryCopy'
import { hasComboItems } from '../../../utilities/productKind'
import { autoProductSlug } from '../hooks/autoProductSlug'
import type { PricingData } from './pricing'

/** The slug, the switches and the worked-out lead price, outside the tabs. */
export const sidebarFields: Field[] = [
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
      position: 'sidebar',
      description:
        'Left empty, it fills itself from the title: lowercase, dashes instead of spaces. It anchors the product on /products and travels in checkout links, so changing it moves the page.',
    },
  },
  {
    // Display only: whether a combo can be sold and what its items cost apart.
    name: 'comboHealth',
    type: 'ui',
    admin: {
      components: {
        Field: '@/components/Admin/ComboHealth#ComboHealth',
      },
      condition: (data) => hasComboItems(data as PricingData),
      position: 'sidebar',
    },
  },
  {
    name: 'available',
    label: 'Available',
    type: 'checkbox',
    defaultValue: true,
    admin: {
      description: 'Off hides the product from the website and it cannot be bought.',
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
  {
    name: 'fromPrice',
    label: 'Lead price',
    type: 'number',
    index: true,
    admin: {
      components: {
        Cell: '@/components/Admin/RupeeCell#RupeeCell',
        Field: '@/components/Admin/RupeeField#RupeeField',
      },
      description:
        'Worked out on every save: the cheapest duration price for a plan, or the price of a one-time product or combo. The shelf sorts and filters by it.',
      position: 'sidebar',
      readOnly: true,
    },
  },
]
