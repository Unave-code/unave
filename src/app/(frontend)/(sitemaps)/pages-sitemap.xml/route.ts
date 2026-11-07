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
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    const dateFallback = new Date().toISOString()

    const defaultSitemap = [
      {
        loc: `${SITE_URL}/search`,
        lastmod: dateFallback,
      },
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

    return [...defaultSitemap, ...productSitemap, ...sitemap]
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
