import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { ProductCategoryView } from '@/components/Store/ProductCategoryView'
import { ProductDetail } from '@/components/Store/ProductDetail'
import type { Footer, Product } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { productPageDescription } from '@/utilities/productPageCopy'
import {
  isProductCategory,
  PRODUCT_CATEGORY_COPY,
  productCategoryHref,
  productHref,
} from '@/utilities/productsCategoryCopy'

/**
 * The one route under /products: a category page or a product page.
 *
 * /products/<category> is a category page and /products/<slug> is a product's
 * own page, both served here. They cannot clash because a product slug can never
 * be one of the three category values (spec 0008, AC-7), so the slug is read as
 * a category first and, failing that, as a product. Anything that is neither
 * lands on the not found page.
 *
 * Live data on every request: a price, a duration or a pause the kitchen edits
 * is here the moment it saves.
 */
export const dynamic = 'force-dynamic'

const findProduct = async (slug: string): Promise<null | Product> => {
  const payload = await getPayload({ config: configPromise })

  const found = await payload.find({
    collection: 'products',
    depth: 1,
    limit: 1,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return found.docs[0] ?? null
}

export async function generateMetadata({
  params,
}: PageProps<'/products/[slug]'>): Promise<Metadata> {
  const { slug } = await params

  if (isProductCategory(slug)) {
    const copy = PRODUCT_CATEGORY_COPY[slug]

    return {
      alternates: { canonical: productCategoryHref(slug) },
      description: copy.metaDescription,
      openGraph: mergeOpenGraph({
        description: copy.metaDescription,
        title: copy.metaTitle,
        url: productCategoryHref(slug),
      }),
      title: copy.metaTitle,
    }
  }

  const product = await findProduct(slug)

  if (!product) return {}

  const description = productPageDescription(product.title)

  return {
    alternates: { canonical: productHref(product.slug) },
    description,
    openGraph: mergeOpenGraph({
      description,
      title: product.title,
      url: productHref(product.slug),
    }),
    title: product.title,
  }
}

export default async function ProductsSegmentPage(props: PageProps<'/products/[slug]'>) {
  const { slug } = await props.params

  if (isProductCategory(slug)) {
    return <ProductCategoryView category={slug} />
  }

  const product = await findProduct(slug)

  if (!product) notFound()

  const footer = (await getCachedGlobal('footer', 1)()) as Footer | null
  const whatsapp = footer?.contact?.whatsapp ?? null

  return <ProductDetail product={product} whatsapp={whatsapp} />
}
