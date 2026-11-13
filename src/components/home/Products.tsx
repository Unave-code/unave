import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { Cta } from '@/components/Cta'
import { Media } from '@/components/Media'
import { EMPTY_SHELF, shelfHref } from '@/utilities/productShelf'
import {
  PRODUCTS_SECTION_CTA,
  PRODUCTS_SECTION_HEADING,
  PRODUCTS_SECTION_INTRO,
} from '@/utilities/homeCopy'
import { productCategoryHref } from '@/utilities/productsCategoryCopy'
import { getHomeSubcategories } from '@/utilities/products'

import { Section } from './Section'

/**
 * The homepage category section (design.md §10.1): subcategory tiles and a link
 * to the full product shelf. Product cards live in BestSellers.
 */
export const ProductShelf: React.FC = async () => {
  const subcategories = await getHomeSubcategories()()
  const subcategoryCount = subcategories.length
  const subcategoryCountLabel =
    subcategoryCount === 1
      ? '1 meal type currently available.'
      : `${subcategoryCount} meal types currently available.`

  return (
    <Section id="products">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <div className="max-w-[58ch]">
          <h2 className="text-h2">{PRODUCTS_SECTION_HEADING}</h2>
          <p className="text-body text-ink-600 mt-4">{PRODUCTS_SECTION_INTRO}</p>
          {subcategoryCount > 0 ? (
            <p className="text-caption text-ink-600 mt-3">{subcategoryCountLabel}</p>
          ) : null}
        </div>

        <Cta className="shrink-0" href="/products" variant="secondary">
          {PRODUCTS_SECTION_CTA}
        </Cta>
      </div>

      {subcategories.length > 0 ? (
        <ul
          aria-label="Meal subcategories"
          className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
        >
          {subcategories.map((subcategory) => {
            const image =
              typeof subcategory.image === 'object' && subcategory.image ? subcategory.image : null
            const tile = (
              <>
                <div className="relative aspect-square overflow-hidden rounded-2xl">
                  {image?.url ? (
                    <Media
                      alt={image.alt?.trim() || subcategory.title}
                      fill
                      imgClassName="object-cover"
                      resource={image}
                      size="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                    />
                  ) : (
                    <Image
                      alt=""
                      aria-hidden="true"
                      className="object-cover"
                      fill
                      sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                      src="/images/product-placeholder.jpg"
                    />
                  )}
                </div>
                <h3 className="text-h3 bg-transparent px-3 py-3 text-center">
                  {subcategory.title}
                </h3>
              </>
            )

            return (
              <li key={subcategory.id}>
                {subcategory.slug ? (
                  <Link
                    aria-label={`Browse ${subcategory.title} products`}
                    className="block rounded-2xl focus-visible:ring-green-500 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:outline-none"
                    href={shelfHref(productCategoryHref(subcategory.category), {
                      ...EMPTY_SHELF,
                      subcategory: subcategory.slug,
                    })}
                  >
                    {tile}
                  </Link>
                ) : (
                  tile
                )}
              </li>
            )
          })}
        </ul>
      ) : null}
    </Section>
  )
}
