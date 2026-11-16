import React from 'react'

import { CategoryTiles, type CategoryTile } from '@/components/CategoryTiles'
import type { Header } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { PRODUCTS_SECTION_HEADING } from '@/utilities/homeCopy'
import {
  CATEGORY_LABEL,
  isProductCategory,
  PRODUCT_CATEGORY_VALUES,
  productCategoryHref,
  type ProductCategoryValue,
} from '@/utilities/productsCategoryCopy'

import { Section } from './Section'

/**
 * The main categories the header menu links to, in menu order and with the
 * menu's own label. A menu with no category links falls back to all three, so
 * the section is never empty just because the menu was edited.
 */
const navCategories = (header: Header | null): Array<{ category: ProductCategoryValue; label: string }> => {
  const seen = new Set<ProductCategoryValue>()
  const found: Array<{ category: ProductCategoryValue; label: string }> = []

  for (const item of header?.navItems ?? []) {
    const url = item.link?.url?.trim() ?? ''
    const match = /^\/products\/([^/?#]+)\/?(?:[?#].*)?$/.exec(url)
    const slug = match?.[1]

    if (slug && isProductCategory(slug) && !seen.has(slug)) {
      seen.add(slug)
      found.push({ category: slug, label: item.link.label || CATEGORY_LABEL[slug] })
    }
  }

  return found.length > 0
    ? found
    : PRODUCT_CATEGORY_VALUES.map((category) => ({ category, label: CATEGORY_LABEL[category] }))
}

/**
 * The homepage category section (design.md §10.1): one tile per main category
 * in the menu, each leading to its category page. Product cards live in BestSellers.
 */
export const ProductShelf: React.FC = async () => {
  const header = (await getCachedGlobal('header', 1)()) as Header | null

  const tiles: CategoryTile[] = navCategories(header).map(({ category, label }) => ({
    category,
    href: productCategoryHref(category),
    key: category,
    title: label,
  }))

  return (
    <Section id="products">
      <div className="text-center">
        <h2 className="text-h2 text-center text-green-900">{PRODUCTS_SECTION_HEADING}</h2>
      </div>

      <CategoryTiles className="mt-8 md:mt-10" label="Product categories" tiles={tiles} />
    </Section>
  )
}
