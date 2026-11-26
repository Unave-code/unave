import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

import { PRODUCT_CATEGORY_VALUES } from '@/utilities/productsCategoryCopy'

const getPagesSitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const SITE_URL =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'https://unave.in'

    const results = await payload.find({
      collection: 'pages',
      overrideAccess: false,
      draft: false,
      depth: 0,
      limit: 1000,
      pagination: false,
      where: {
        _status: {
          equals: 'published',
        },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    const products = await payload.find({
      collection: 'products',
      overrideAccess: false,
      depth: 0,
      limit: 1000,
      pagination: false,
      where: { available: { equals: true } },
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    const dateFallback = new Date().toISOString()

    /* The pages built in code rather than in the Pages collection. Without
       these the home, about, contact and kitchen pages were missing from the
       sitemap entirely. */
    const codeRoutes = ['/', '/about', '/our-kitchen', '/contact', '/meal-subscription']

    const defaultSitemap = [
      ...codeRoutes.map((route) => ({
        loc: route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}`,
        lastmod: dateFallback,
      })),
      {
        loc: `${SITE_URL}/blog`,
        lastmod: dateFallback,
      },
      {
        loc: `${SITE_URL}/products`,
        lastmod: dateFallback,
      },
      // Spec 0008, AC-6: one entry per product category page.
      ...PRODUCT_CATEGORY_VALUES.map((category) => ({
        loc: `${SITE_URL}/products/${category}`,
        lastmod: dateFallback,
      })),
    ]

    const sitemap = results.docs
      ? results.docs
          .filter((page) => Boolean(page?.slug))
          .map((page) => {
            return {
              loc: page?.slug === 'home' ? `${SITE_URL}/` : `${SITE_URL}/${page?.slug}`,
              lastmod: page.updatedAt || dateFallback,
            }
          })
      : []

    // Every product has a page of its own under /products (design.md §6.15).
    const productSitemap = products.docs
      .filter((product) => Boolean(product?.slug))
      .map((product) => ({
        loc: `${SITE_URL}/products/${product.slug}`,
        lastmod: product.updatedAt || dateFallback,
      }))

    // A Pages document can share an address with a code route (a "home" page, say); list each address once.
    const seen = new Set<string>()
    return [...defaultSitemap, ...productSitemap, ...sitemap].filter((entry) => {
      if (seen.has(entry.loc)) return false
      seen.add(entry.loc)
      return true
    })
  },
  ['pages-sitemap'],
  {
    tags: ['pages-sitemap'],
  },
)

export async function GET() {
  const sitemap = await getPagesSitemap()

  return getServerSideSitemap(sitemap)
}
