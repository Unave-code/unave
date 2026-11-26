/**
 * The words and labels for the product category pages (spec 0008).
 *
 * One shared source, by rule of spec 0008: the three category route values,
 * their display labels, and the words on each category page all live here, so
 * a label never says one thing on a product card and another on its page. Audience
 * names are not here: staff manage them in the admin (Catalogue → Audiences).
 *
 * The products themselves stay CMS data. Only these words are code, like every
 * other page in this site.
 */

import type { Product } from '@/payload-types'

/** The three category values, which are also the three route slugs. */
export const PRODUCT_CATEGORY_VALUES = [
  'ready-to-cook',
  'ready-to-eat',
  'fresh-from-produce',
] as const

export type ProductCategoryValue = (typeof PRODUCT_CATEGORY_VALUES)[number]

export const isProductCategory = (value: string): value is ProductCategoryValue =>
  (PRODUCT_CATEGORY_VALUES as readonly string[]).includes(value)

/** The web address of a category page, the one route map every link uses. */
export const productCategoryHref = (category: ProductCategoryValue): string =>
  `/products/${category}`

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

/** Accessible name for the category badge turned link on a product's page. */
export const categoryBadgeAriaLabel = (category: ProductCategoryValue): string =>
  `Browse ${CATEGORY_LABEL[category]} products`

interface ProductCategoryCopy {
  /** The small label above the headline. It sits inside the h1 and carries the page's query. */
  eyebrow: string
  /** The main headline, with the italic gold accent that follows it. */
  headline: string
  headlineAccent: string
  /** The direct answer under the headline: what the range is, who it suits, and that we deliver in Chennai. */
  intro: string
  metaDescription: string
  /** Without the brand: the layout adds "| UNAVE". */
  metaTitle: string
  /** The questions under the shelf, also published as FAQPage data. Facts only; no shelf lives or areas we have not confirmed. */
  faq: readonly { answer: string; question: string }[]
  faqHeading: string
}

/** Answers every category page shares, word for word. */
const ORDER_ANSWER =
  'Add a product from this page to your cart and pay once at checkout. You can look around without an account; you sign in only at checkout so the kitchen knows who ordered and where to deliver. Prefer to ask first? Message us on WhatsApp.'
const DELIVERY_ANSWER =
  'UNAVE cooks in Chennai and delivers within the city. Share your address when you order or message us, and we confirm that we reach you before anything is prepared.'

/**
 * The words on each category page, keyed by the category value. Primary and
 * secondary queries per page are in docs/seo/keyword-map.md.
 */
export const PRODUCT_CATEGORY_COPY: Record<ProductCategoryValue, ProductCategoryCopy> = {
  'fresh-from-produce': {
    eyebrow: 'Fresh food online in Chennai',
    headline: 'Straight from the market,',
    headlineAccent: 'to your table',
    intro:
      'Fresh from produce is UNAVE’s range of fruits and vegetables chosen for what is fresh this week, then cleaned and cut or cooked simply in our Chennai kitchen. Order fresh produce online and we deliver it to your door, washed and ready to use.',
    metaDescription:
      'Buy fresh food online in Chennai: vegetables and fruits chosen for the week, washed, cut or cooked simply in the UNAVE kitchen and delivered to your door.',
    metaTitle: 'Fresh Food Online in Chennai | Fresh Produce Delivery',
    faqHeading: 'Questions about fresh produce',
    faq: [
      {
        question: 'What is in the Fresh from produce range?',
        answer:
          'Fruits and vegetables chosen for what is fresh this week, cleaned and cut or cooked simply in the UNAVE kitchen in Chennai. It suits anyone who wants fresh produce delivered without the washing and chopping.',
      },
      {
        question: 'Do you sell cut vegetables?',
        answer:
          'Yes. Produce is washed, peeled and cut by hand in small lots on the morning it is prepared, then sealed and labelled with what is inside, so it is ready to cook when it reaches you.',
      },
      {
        question: 'Is your produce organic?',
        answer:
          'We do not call our produce organic, because we only use that word with a certificate behind it. We buy for the day’s menu, never for stock, and check everything on arrival. Ask us about any item and we will answer honestly.',
      },
      { question: 'Do you deliver fresh produce across Chennai?', answer: DELIVERY_ANSWER },
      { question: 'How do I order?', answer: ORDER_ANSWER },
    ],
  },
  'ready-to-cook': {
    eyebrow: 'Ready to cook food in Chennai',
    headline: 'The chopping is done,',
    headlineAccent: 'the cooking is yours',
    intro:
      'Ready-to-cook food from UNAVE is prepped in our Chennai kitchen: vegetables cleaned and cut, masalas measured, and only the last step left to you. It is home-style cooking without the prep work, delivered to your door.',
    metaDescription:
      'Ready to cook food in Chennai from UNAVE: vegetables cleaned and cut, masalas measured and delivered to your door, so home-style cooking takes minutes.',
    metaTitle: 'Ready to Cook Food in Chennai | Meal Kits Delivered',
    faqHeading: 'Questions about ready-to-cook food',
    faq: [
      {
        question: 'What is ready-to-cook food?',
        answer:
          'Ready-to-cook food is food that has been prepped for you: vegetables cleaned and cut and masalas measured, so only the cooking is left. UNAVE prepares it in its Chennai kitchen and delivers it, so you cook home-style without the prep work.',
      },
      {
        question: 'How fresh is it?',
        answer:
          'Everything is washed and cut on the morning it is prepared, in lots small enough for one person to watch, then sealed and labelled with what is inside the box.',
      },
      {
        question: 'What is the difference between ready to cook and ready to eat?',
        answer:
          'Ready to cook leaves the last step to you: the prep is done and you cook it at home the way your family likes. Ready to eat is cooked in our kitchen and only needs heating. Both are delivered in Chennai.',
      },
      { question: 'Do you deliver ready-to-cook food across Chennai?', answer: DELIVERY_ANSWER },
      { question: 'How do I order?', answer: ORDER_ANSWER },
    ],
  },
  'ready-to-eat': {
    eyebrow: 'Ready to eat food in Chennai',
    headline: 'Cooked in our kitchen,',
    headlineAccent: 'served at yours',
    intro:
      'Ready-to-eat food from UNAVE is home-style meals cooked fresh each morning in our Chennai kitchen and delivered to your door, ready to heat and eat. Order a single meal, or a weekly or monthly plan of lunches and dinners, so nobody at home has to stand at the stove.',
    metaDescription:
      'Ready to eat food in Chennai: home-style meals cooked fresh in the UNAVE kitchen and delivered. Order one meal or a weekly or monthly plan of lunches and dinners.',
    metaTitle: 'Ready to Eat Food in Chennai | Home-Style Meals',
    faqHeading: 'Questions about ready-to-eat meals',
    faq: [
      {
        question: 'What is ready-to-eat food from UNAVE?',
        answer:
          'Home-style meals cooked fresh in the UNAVE kitchen in Chennai and delivered to your door, ready to heat and eat. They suit working people, families and anyone who wants a proper meal without cooking it.',
      },
      {
        question: 'Is it home-style food?',
        answer:
          'Yes. Meals are cooked the way you would at home, with vegetables, dal, rice, rotis and millets, and with oil and salt kept in check. Each one is cooked the same morning it is sent out.',
      },
      {
        question: 'Can I order meals for the whole week, like a tiffin service?',
        answer:
          'Yes. Meal plans run for a week or a month of lunches and dinners: choose how long you want meals to arrive, pay once at checkout, and our team calls you to confirm when your plan begins.',
      },
      { question: 'Do you deliver ready-to-eat meals across Chennai?', answer: DELIVERY_ANSWER },
      { question: 'How do I order?', answer: ORDER_ANSWER },
    ],
  },
}

/** The band call to action, which scrolls down to the grid on the same page. */
export const PRODUCTS_CATEGORY_CTA_BROWSE = 'Browse these products'