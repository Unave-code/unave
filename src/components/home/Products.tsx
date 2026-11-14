import { CookingPot, Leaf, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { EMPTY_SHELF, shelfHref } from '@/utilities/productShelf'
import { PRODUCTS_SECTION_HEADING } from '@/utilities/homeCopy'
import { productCategoryHref } from '@/utilities/productsCategoryCopy'
import { getHomeSubcategories } from '@/utilities/products'

import { Media } from '@/components/Media'
import type { Subcategory } from '@/payload-types'
import { cn } from '@/utilities/ui'

import { Section } from './Section'

/** Each shelf gets its own icon and tint, so a tile without a photo still says
 *  which kind of food it leads to (design.md §3.4). */
const CATEGORY_LOOK: Record<Subcategory['category'] | 'fallback', { Icon: LucideIcon; tint: string }> = {
  'fresh-from-produce': { Icon: Leaf, tint: 'bg-cat-healthy-tint' },
  'ready-to-cook': { Icon: CookingPot, tint: 'bg-cat-nutrition-tint' },
  'ready-to-eat': { Icon: UtensilsCrossed, tint: 'bg-cat-diet-tint' },
  fallback: { Icon: Leaf, tint: 'bg-green-100' },
}

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
          className="mt-8 grid w-full grid-cols-3 gap-3 sm:flex sm:flex-wrap sm:justify-center md:mt-10 md:gap-4"
        >
          {subcategories.map((subcategory) => {
            const image =
              subcategory.image && typeof subcategory.image === 'object' ? subcategory.image : null
            const { Icon, tint } = CATEGORY_LOOK[subcategory.category] ?? CATEGORY_LOOK.fallback
            const tile = (
              <>
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full ring-4 ring-card shadow-sm transition-[background-color,box-shadow,transform] duration-300 ease-out group-hover:shadow-md sm:size-20',
                    image?.url ? 'bg-green-50' : [tint, 'group-hover:bg-green-700 group-focus-visible:bg-green-700'],
                  )}
                >
                  {image?.url ? (
                    <Media
                      alt=""
                      fill
                      imgClassName="object-cover transition-transform duration-500 ease-out group-hover:scale-110 motion-reduce:group-hover:scale-100"
                      resource={image}
                      size="80px"
                    />
                  ) : (
                    <Icon
                      className="size-6 text-green-700 transition-[color,transform] duration-300 group-hover:text-gold-400 group-focus-visible:text-gold-400 ease-out group-hover:scale-110 motion-reduce:group-hover:scale-100 sm:size-9"
                      strokeWidth={1.5}
                    />
                  )}
                </span>
                <h3
                  className="text-caption text-green-900 line-clamp-2 w-full wrap-anywhere font-semibold leading-tight sm:text-body sm:leading-snug"
                  title={subcategory.title}
                >
                  {subcategory.title}
                </h3>
              </>
            )
            const className =
              'group relative flex h-full min-h-32 w-full min-w-0 flex-col items-center justify-start gap-3 overflow-hidden rounded-2xl border border-transparent bg-gradient-to-b from-green-50 from-0% via-card via-45% to-card px-2 pt-4 pb-3 text-center shadow-sm transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-1 hover:border-gold-300 hover:shadow-md focus-visible:ring-green-500 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:min-h-44 sm:w-40 sm:shrink-0 sm:gap-4 sm:px-3 sm:pt-6 sm:pb-4'

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
                    <span
                      aria-hidden="true"
                      className="bg-gold-400 absolute inset-x-6 bottom-0 h-1 origin-center scale-x-0 rounded-t-full transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none"
                    />
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
