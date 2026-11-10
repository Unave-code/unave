import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import { Plugin } from 'payload'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { searchFields } from '@/search/fieldOverrides'
import { beforeSyncWithSearch } from '@/search/beforeSync'

import { Page, Post } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import { emailFormSubmission } from './formSubmissionNotice'

const generateTitle: GenerateTitle<Post | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | Payload Website Template` : 'Payload Website Template'
}

const generateURL: GenerateURL<Post | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['pages', 'posts'],
    overrides: {
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    formSubmissionOverrides: {
      hooks: {
        afterChange: [emailFormSubmission],
      },
    },
    formOverrides: {
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },
    },
  }),
  searchPlugin({
    collections: ['posts'],
    beforeSync: beforeSyncWithSearch,
    searchOverrides: {
      fields: ({ defaultFields }) => {
        return [...defaultFields, ...searchFields]
      },
    },
  }),
  /**
   * The Model Context Protocol server (design.md §6.16 covers the admin side).
   *
   * Enabled here means the operation exists as an MCP tool; what any given key
   * may actually call is chosen per key in the admin under MCP → API Keys, and
   * the key acts as its owning staff user, so every collection's own access
   * rules still apply underneath. The exposure below is deliberately
   * read-mostly: the store's money and identity live in this database, so
   * `users` and `email-settings` (which holds the mail credentials) are never
   * exposed, delete is off everywhere — pausing a product is the soft delete —
   * and only the kitchen's own catalogue lists, media and subcategories accept
   * writes. Prices travel in paise, as everywhere else in the codebase.
   */
  mcpPlugin({
    collections: {
      products: {
        description:
          'The meal products and food items the kitchen sells. Title, slug, description, points, image, category, subcategory, audience, available (paused) and featured; plans carry a durations array and one-time products a price, both stored in paise.',
        enabled: { find: true, create: true, update: true },
      },
      subcategories: {
        description:
          'The finer labels inside a product category, for example Breakfast. Each has a title and exactly one category.',
        enabled: { find: true, create: true, update: true },
      },
      media: {
        description:
          'The uploaded photographs, including every product photo. Create takes the file and an optional alt text.',
        enabled: { create: true, find: true },
      },
      categories: {
        description:
          'The three fixed product categories: ready to cook, ready to eat, fresh from produce.',
        enabled: { find: true },
      },
      pages: {
        description: 'The CMS pages, such as the policies, with slug and content blocks.',
        enabled: { find: true },
      },
      posts: {
        description: 'The blog articles with title, slug, content and categories.',
        enabled: { find: true },
      },
      orders: {
        description:
          'Paid orders only: the customer, the item lines with unit prices in paise, the delivery details and the payment ids. Rows are written once by the payment confirmation and never edited.',
        enabled: { find: true },
      },
      customers: {
        description:
          'The customer accounts: name, email, phone and saved address. Personal data — read only, and only what staff access rules already allow.',
        enabled: { find: true },
      },
      enquiries: {
        description: 'The messages sent through the contact form.',
        enabled: { find: true },
      },
      'order-requests': {
        description: 'The cancel, refund and pause requests customers raise on paid orders.',
        enabled: { find: true },
      },
    },
    globals: {
      header: {
        description:
          'The site chrome: menu links, the announcement strip and the WhatsApp button.',
        enabled: { find: true },
      },
      footer: {
        description:
          'The site chrome: tagline, link columns, contact details, disclaimer and copyright.',
        enabled: { find: true },
      },
      hero: {
        description: 'The homepage hero copy.',
        enabled: { find: true },
      },
    },
    mcp: {
      serverOptions: {
        serverInfo: {
          name: 'UNAVE MCP Server',
          version: '1.0.0',
        },
      },
    },
  }),
]
