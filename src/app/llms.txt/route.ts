import { getServerSideURL } from '@/utilities/getURL'
import { BRAND_DESCRIPTION } from '@/utilities/structuredData'
import { PRODUCT_CATEGORY_COPY, PRODUCT_CATEGORY_VALUES, productCategoryHref } from '@/utilities/productsCategoryCopy'

/**
 * /llms.txt: a short plain-text guide to the site for AI tools (llmstxt.org).
 * Nothing is known to require it; it is cheap to keep correct because it is
 * built from the same copy modules the pages render. Update the list when a
 * public page is added or removed.
 */
export const dynamic = 'force-static'

export function GET(): Response {
  const base = getServerSideURL().replace(/\/$/, '')

  const categories = PRODUCT_CATEGORY_VALUES.map(
    (value) =>
      `- [${PRODUCT_CATEGORY_COPY[value].metaTitle}](${base}${productCategoryHref(value)}): ${PRODUCT_CATEGORY_COPY[value].metaDescription}`,
  ).join('\n')

  const body = `# UNAVE

> ${BRAND_DESCRIPTION}

UNAVE is based in Chennai, Tamil Nadu, India. Anyone can browse the site and message the kitchen without an account; an account is only needed to pay at checkout.

## Shop

- [All products](${base}/products): every product from the UNAVE kitchen, with a comparison of the three ranges.
${categories}
- [Meal subscription](${base}/meal-subscription): weekly and monthly home-style meal plans with their menus.

## About the kitchen

- [About UNAVE](${base}/about): the founder's story and what the name means.
- [Our kitchen](${base}/our-kitchen): how meals are prepared, cooked, packed and checked each day.
- [Contact](${base}/contact): WhatsApp, phone, email and the contact form.
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
