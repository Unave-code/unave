import { Leaf } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { Cta } from '@/components/Cta'
import { EMPTY_SHELF, shelfHref } from '@/utilities/productShelf'
import { PRODUCTS_SECTION_CTA, PRODUCTS_SECTION_HEADING } from '@/utilities/homeCopy'
import { productCategoryHref } from '@/utilities/productsCategoryCopy'
import { getHomeSubcategories } from '@/utilities/products'

import { Section } from './Section'

/**
 * The homepage category section (design.md §10.1): subcategory tiles and a link
 * to the full product shelf. Product cards live in BestSellers.
 */
export const ProductShelf: React.FC = async () => {
  const subcategories = await getHomeSubcategories()()

  return (
    <Section id="products">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <h2 className="text-h2">{PRODUCTS_SECTION_HEADING}</h2>
        <Cta className="shrink-0" href="/products" variant="secondary">
          {PRODUCTS_SECTION_CTA}
        </Cta>
      </div>

      {subcategories.length > 0 ? (
        <ul
          aria-label="Meal subcategories"
          className="mt-6 flex w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
          tabIndex={0}
        >
          {subcategories.map((subcategory) => {
            const tile = (
              <>
                <Leaf aria-hidden="true" className="size-12 text-green-700" strokeWidth={1.5} />
                <h3 className="text-lg text-gold-600 font-serif leading-tight">
                  {subcategory.title}
                </h3>
              </>
            )
            const className =
              'flex size-40 shrink-0 flex-col items-center justify-center gap-3 rounded-2xl border border-gold-300 bg-card p-4 text-center transition-colors hover:bg-green-50 focus-visible:ring-green-500 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none'

            return (
              <li className="snap-start" key={subcategory.id}>
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
