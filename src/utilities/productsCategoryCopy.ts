/**
 * The words and labels for the product category pages (spec 0008).
 *
 * One shared source, by rule of spec 0008: the three category route values,
 * their display labels, and the words on each category page all live here, so
 * a label never says one thing on a product card and another on its page. The
 * audience labels live here too, for the same reason: the badge on a card and
 * the filter tile on a category page must agree.
 *
 * The products themselves stay CMS data. Only these words are code, like every
 * other page in this site.
 */

import type { Product } from '@/payload-types'

/** The three category values, which are also the three route slugs. */
export const PRODUCT_CATEGORY_VALUES = ['ready-to-cook', 'ready-to-eat', 'fresh-from-produce'] as const

export type ProductCategoryValue = (typeof PRODUCT_CATEGORY_VALUES)[number]

export const isProductCategory = (value: string): value is ProductCategoryValue =>
  (PRODUCT_CATEGORY_VALUES as readonly string[]).includes(value)

/** The web address of a category page, the one route map every link uses. */
export const productCategoryHref = (category: ProductCategoryValue): string => `/products/${category}`

/**
 * The web address of a product's own page. Products share the `/products/<slug>`
 * space with the category pages, which is why a product slug can never be one of
 * the three category values (spec 0008, AC-7): the two route through this one
 * segment.
 */
export const productHref = (slug: string): string => `/products/${slug}`

/** Label map shared by the product card badges and the category pages. */
export const CATEGORY_LABEL: Record<Product['category'], string> = {
  'fresh-from-produce': 'Fresh from produce',
  'ready-to-cook': 'Ready to cook',
  'ready-to-eat': 'Ready to eat',
}

/** Label map shared by the product card badges and the filter tiles. */
export const AUDIENCE_LABEL: Record<Product['audience'], string> = {
  adults: 'Adults',
  kids: 'Kids',
  special: 'Special',
}

/** The filter tiles: every audience, plus All, which is the default. */
export const AUDIENCE_FILTER_ORDER = ['all', 'kids', 'adults', 'special'] as const

export type ProductAudienceFilterValue = (typeof AUDIENCE_FILTER_ORDER)[number]

export const AUDIENCE_FILTER_LABEL: Record<ProductAudienceFilterValue, string> = {
  adults: AUDIENCE_LABEL.adults,
  all: 'All',
  kids: AUDIENCE_LABEL.kids,
  special: AUDIENCE_LABEL.special,
}

/** Accessible name for the category badge turned link on a product's page. */
export const categoryBadgeAriaLabel = (category: ProductCategoryValue): string =>
  `Browse ${CATEGORY_LABEL[category]} products`

interface ProductCategoryCopy {
  /** The small label above the headline in the opening band. */
  eyebrow: string
  /** The main headline, with the italic gold accent that follows it. */
  headline: string
  headlineAccent: string
  /** The one line intro under the headline. */
  intro: string
  metaDescription: string
  metaTitle: string
}

/** The words on each category page, keyed by the category value. */
export const PRODUCT_CATEGORY_COPY: Record<ProductCategoryValue, ProductCategoryCopy> = {
  'fresh-from-produce': {
    eyebrow: 'Fresh from produce',
    headline: 'Straight from the market,',
    headlineAccent: 'to your table',
    intro:
      'Built on what is fresh this week: fruits and vegetables at their best, cleaned and cut or cooked simply. Honest food that lets the season lead.',
    metaDescription:
      'Meal products built on fresh fruits and vegetables, cleaned, cut or cooked simply. Fresh from produce products from the UNAVE kitchen.',
    metaTitle: 'Fresh from produce products',
  },
  'ready-to-cook': {
    eyebrow: 'Ready to cook',
    headline: 'The chopping is done,',
    headlineAccent: 'the cooking is yours',
    intro:
      'Vegetables cleaned and cut, masalas measured, and the last step left to you. Home style food without the prep work, finished in your kitchen the way your family likes it.',
    metaDescription:
      'Chopped, measured and delivered: ready to cook meal products that leave the last, best step of cooking to you. Pay once, cook easy every day.',
    metaTitle: 'Ready to cook products',
  },
  'ready-to-eat': {
    eyebrow: 'Ready to eat',
    headline: 'Cooked in our kitchen,',
    headlineAccent: 'served at yours',
    intro:
      'Heat and eat. Home style meals cooked fresh in our kitchen and delivered to your door, so nobody at home has to stand at the stove.',
    metaDescription:
      'Home style meals cooked fresh in our kitchen and delivered to your door. Ready to eat products: pay once, and eat well every day.',
    metaTitle: 'Ready to eat products',
  },
}

/** The band call to action, which scrolls down to the grid on the same page. */
export const PRODUCTS_CATEGORY_CTA_BROWSE = 'Browse these products'

/** The closing section, shared word for word by all three category pages. */
export const PRODUCTS_CATEGORY_FINAL_HEADING = 'Ready when you are'
export const PRODUCTS_CATEGORY_FINAL_BODY =
  'Add a product from this shelf to your cart, pay once at checkout, and the kitchen takes it from there. Questions first? We are one message away.'
