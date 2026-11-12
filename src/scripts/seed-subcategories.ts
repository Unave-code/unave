import 'dotenv/config'

import path from 'path'
import { getPayload } from 'payload'

import config from '../payload.config'
import type { ProductCategoryValue } from '../utilities/productsCategoryCopy'

const subcategories: {
  alt: string
  category: ProductCategoryValue
  image: string
  slug: string
  title: string
}[] = [
  {
    alt: 'A plated meal ready to eat',
    category: 'ready-to-eat',
    image: 'gallery-1.jpg',
    slug: 'breakfast',
    title: 'Breakfast',
  },
  {
    alt: 'A fresh meal with vegetables',
    category: 'ready-to-eat',
    image: 'gallery-2.jpg',
    slug: 'lunch',
    title: 'Lunch',
  },
  {
    alt: 'A prepared meal served on a plate',
    category: 'ready-to-eat',
    image: 'gallery-3.jpg',
    slug: 'dinner',
    title: 'Dinner',
  },
  {
    alt: 'Healthy food prepared for cooking',
    category: 'ready-to-cook',
    image: 'category-healthy.jpg',
    slug: 'tiffin',
    title: 'Tiffin',
  },
  {
    alt: 'Fresh produce and ingredients',
    category: 'fresh-from-produce',
    image: 'category-nutrition.jpg',
    slug: 'vegetables',
    title: 'Vegetables',
  },
]

const payload = await getPayload({ config })
let created = 0

for (const subcategory of subcategories) {
  const existingSubcategory = await payload.find({
    collection: 'subcategories',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: subcategory.slug } },
  })

  if (existingSubcategory.docs.length > 0) continue

  const existingMedia = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { alt: { equals: subcategory.alt } },
  })
  const image =
    existingMedia.docs[0] ??
    (await payload.create({
      collection: 'media',
      data: { alt: subcategory.alt },
      filePath: path.resolve(process.cwd(), 'public', 'images', subcategory.image),
      overrideAccess: true,
    }))

  await payload.create({
    collection: 'subcategories',
    data: {
      category: subcategory.category,
      image: image.id,
      slug: subcategory.slug,
      title: subcategory.title,
    },
    context: { disableRevalidate: true },
    overrideAccess: true,
  })
  created += 1
}

payload.logger.info(
  `Created ${created} subcategories; skipped ${subcategories.length - created} existing.`,
)
process.exit(0)
