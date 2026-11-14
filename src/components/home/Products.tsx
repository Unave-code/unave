import { Leaf } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { EMPTY_SHELF, shelfHref } from '@/utilities/productShelf'
import { PRODUCTS_SECTION_HEADING } from '@/utilities/homeCopy'
import { productCategoryHref } from '@/utilities/productsCategoryCopy'
import { getHomeSubcategories } from '@/utilities/products'

import { Section } from './Section'

/**
 * The homepage category section (design.md §10.1): compact mobile tiles and
 * 160px desktop tiles in a wrapping layout. Product cards live in BestSellers.
 */
export const ProductShelf: React.FC = async () => {
  const subcategories = await getHomeSubcategories()()

  return (
    <Section id="products">
      <div className="text-center">
        <h2 className="text-h2 text-center text-green-900">{PRODUCTS_SECTION_HEADING}</h2>
      </div>

      {subcategories.length > 0 ? (
        <ul
          aria-label="Meal subcategories"
          className="mt-6 grid w-full grid-cols-5 gap-1 sm:flex sm:flex-wrap sm:justify-center md:gap-3"
        >
          {subcategories.map((subcategory) => {
            const tile = (
              <>
                <Leaf
                  aria-hidden="true"
                  className="size-6 text-green-700 sm:size-12"
                  strokeWidth={1.5}
                />
                <h3 className="text-caption text-gold-600 wrap-anywhere font-serif leading-tight sm:text-lg">
                  {subcategory.title}
                </h3>
              </>
            )
            const className =
              'flex min-h-16 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border border-gold-300 bg-card p-1 text-center transition-colors hover:bg-green-50 focus-visible:ring-green-500 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none sm:size-40 sm:shrink-0 sm:gap-3 sm:p-4'

            return (
              <li className="min-w-0" key={subcategory.id}>
                {subcategory.slug ? (
                  <Link
                    aria-label={`Browse ${subcategory.title} products`}
                    className={className}
                    href={shelfHref(productCategoryHref(subcategory.category), {
                      ...EMPTY_SHELF,
                      subcategory: subcategory.slug,
                    })}
                  >
                    {tile}
                  </Link>
                ) : (
                  <div className={className}>{tile}</div>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}
    </Section>
  )
}
