import type { Footer } from '@/payload-types'

import { getServerSideURL } from './getURL'

/**
 * Schema.org JSON-LD for the public pages (design.md §13).
 *
 * One builder per kind of node, so the kitchen's name, city and contact details
 * are described the same way on every page that mentions them. Contact facts come
 * from the Footer global, the same source the contact page and the footer read,
 * so a phone number edited in the admin changes the markup too. A field the
 * kitchen has not filled in is left out rather than guessed.
 */

export const BRAND_NAME = 'UNAVE'
export const BRAND_CITY = 'Chennai'

/** The one sentence that says what UNAVE is, wherever a page needs it. */
export const BRAND_DESCRIPTION =
  'UNAVE is a cloud kitchen in Chennai that cooks ready-to-eat home-style meals, prepares ready-to-cook food and packs fresh produce in its own kitchen, then delivers it to your door.'

type Contact = NonNullable<Footer['contact']> | null | undefined

const siteUrl = (): string => getServerSideURL().replace(/\/$/, '')

const kitchenId = (): string => `${siteUrl()}/#kitchen`
const websiteId = (): string => `${siteUrl()}/#website`
const organizationId = (): string => `${siteUrl()}/#organization`

/** The three shelves, as the category pages name them. */
const CATALOGUE = [
  { name: 'Ready to Cook', path: '/products/ready-to-cook' },
  { name: 'Fresh from Produce', path: '/products/fresh-from-produce' },
  { name: 'Ready to Eat', path: '/products/ready-to-eat' },
] as const

const absolute = (path: string): string => (path.startsWith('http') ? path : `${siteUrl()}${path}`)

/** The kitchen as a business: who it is, where it cooks and how to reach it. */
export const kitchenJsonLd = (contact?: Contact) => {
  const phone = contact?.phone?.trim()
  const email = contact?.email?.trim()
  const address = contact?.address?.trim()

  return {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    '@id': kitchenId(),
    name: BRAND_NAME,
    alternateName: 'UNAVE cloud kitchen',
    description: BRAND_DESCRIPTION,
    url: `${siteUrl()}/`,
    logo: absolute('/favicon-192.png'),
    image: absolute('/og.png'),
    servesCuisine: ['South Indian', 'Indian', 'Healthy'],
    areaServed: { '@type': 'City', name: BRAND_CITY },
    parentOrganization: { '@id': organizationId() },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'UNAVE products',
      itemListElement: CATALOGUE.map((shelf) => ({
        '@type': 'OfferCatalog',
        name: shelf.name,
        url: absolute(shelf.path),
      })),
    },
    potentialAction: {
      '@type': 'OrderAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: absolute('/products'),
        actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'],
      },
    },
    ...(address
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: address,
            addressLocality: BRAND_CITY,
            addressRegion: 'Tamil Nadu',
            addressCountry: 'IN',
          },
        }
      : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(email ? { email } : {}),
    ...(phone || email
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            areaServed: 'IN',
            ...(phone ? { telephone: phone } : {}),
            ...(email ? { email } : {}),
          },
        }
      : {}),
  }
}

/** The company behind the kitchen; the website's publisher. */
export const organizationJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': organizationId(),
  name: BRAND_NAME,
  url: `${siteUrl()}/`,
  logo: absolute('/favicon-192.png'),
  description: BRAND_DESCRIPTION,
})

export const websiteJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': websiteId(),
  name: BRAND_NAME,
  url: `${siteUrl()}/`,
  publisher: { '@id': organizationId() },
  inLanguage: 'en-IN',
})

/** The homepage itself: part of the website, about the kitchen. */
export const homePageJsonLd = (name: string, description: string) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${siteUrl()}/#webpage`,
  url: `${siteUrl()}/`,
  name,
  description,
  inLanguage: 'en-IN',
  isPartOf: { '@id': websiteId() },
  about: { '@id': kitchenId() },
  primaryImageOfPage: { '@type': 'ImageObject', url: absolute('/og.png') },
})

/** A page about the kitchen itself (about, contact) or a shelf, tied to the business node. */
export const webPageJsonLd = (
  type: 'AboutPage' | 'CollectionPage' | 'ContactPage',
  path: string,
  name: string,
  description: string,
  options: { about?: 'kitchen' | 'organization'; breadcrumb?: boolean; image?: string } = {},
) => ({
  '@context': 'https://schema.org',
  '@type': type,
  '@id': `${absolute(path)}#webpage`,
  name,
  description,
  url: absolute(path),
  inLanguage: 'en-IN',
  isPartOf: { '@id': websiteId() },
  about: { '@id': options.about === 'organization' ? organizationId() : kitchenId() },
  ...(options.breadcrumb ? { breadcrumb: { '@id': `${absolute(path)}#breadcrumb` } } : {}),
  primaryImageOfPage: { '@type': 'ImageObject', url: absolute(options.image ?? '/og.png') },
})

export type BreadcrumbStep = { href: string; label: string }

/**
 * The same trail the visible breadcrumbs show; every step carries its address.
 * The list takes the last step's address plus #breadcrumb as its id, so a
 * page node can point at it.
 */
export const breadcrumbJsonLd = (steps: BreadcrumbStep[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  ...(steps.length ? { '@id': `${absolute(steps[steps.length - 1].href)}#breadcrumb` } : {}),
  itemListElement: steps.map((step, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: step.label,
    item: absolute(step.href),
  })),
})

export const faqJsonLd = (items: readonly { answer: string; question: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
})

export const itemListJsonLd = (name: string, items: { href: string; name: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    url: absolute(item.href),
  })),
})

/** Serialises JSON-LD for a script tag; the less-than sign is escaped so content cannot close it. */
export const jsonLdHtml = (data: unknown): string => JSON.stringify(data).replace(/</g, '\\u003c')
