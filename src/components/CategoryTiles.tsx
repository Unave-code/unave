import { CookingPot, Leaf, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { Media } from '@/components/Media'
import type { Media as MediaDoc } from '@/payload-types'
import type { ProductCategoryValue } from '@/utilities/productsCategoryCopy'
import { cn } from '@/utilities/ui'

/** Each shelf gets its own icon and tint, so a tile without a photo still says
 *  which kind of food it leads to (design.md §3.4). */
export const CATEGORY_LOOK: Record<ProductCategoryValue | 'fallback', { Icon: LucideIcon; tint: string }> =
  {
    'fresh-from-produce': { Icon: Leaf, tint: 'bg-cat-healthy-tint' },
    'ready-to-cook': { Icon: CookingPot, tint: 'bg-cat-nutrition-tint' },
    'ready-to-eat': { Icon: UtensilsCrossed, tint: 'bg-cat-diet-tint' },
    fallback: { Icon: Leaf, tint: 'bg-green-100' },
  }

export interface CategoryTile {
  /** Marks the tile for the view the customer is already on. */
  current?: boolean
  /** Which shelf's icon and tint to show when there is no photo. */
  category?: ProductCategoryValue
  href: null | string
  image?: MediaDoc | null
  key: number | string
  title: string
}

/**
 * The round-icon category tiles (design.md §10.1): compact mobile tiles and
 * 160px desktop tiles in a wrapping layout. The homepage uses them for the main
 * categories and each category page for its subcategories.
 */
export const CategoryTiles: React.FC<{
  className?: string
  label: string
  tiles: CategoryTile[]
}> = ({ className, label, tiles }) => {
  if (tiles.length === 0) return null

  return (
    <ul
      aria-label={label}
      className={cn(
        'grid w-full grid-cols-3 gap-3 sm:flex sm:flex-wrap sm:justify-center md:gap-4',
        className,
      )}
    >
      {tiles.map((item) => {
        const image = item.image?.url ? item.image : null
        const { Icon, tint } = CATEGORY_LOOK[item.category ?? 'fallback'] ?? CATEGORY_LOOK.fallback
        const tile = (
          <>
            <span
              aria-hidden="true"
              className={cn(
                'relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full ring-4 ring-card shadow-sm transition-[background-color,box-shadow,transform] duration-300 ease-out group-hover:shadow-md sm:size-20',
                image
                  ? 'bg-green-50'
                  : [tint, 'group-hover:bg-green-700 group-focus-visible:bg-green-700'],
              )}
            >
              {image ? (
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
              title={item.title}
            >
              {item.title}
            </h3>
          </>
        )
        const className = cn(
          'group relative flex h-full min-h-32 w-full min-w-0 flex-col items-center justify-start gap-3 overflow-hidden rounded-2xl border bg-gradient-to-b from-green-50 from-0% via-card via-45% to-card px-2 pt-4 pb-3 text-center shadow-sm transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-1 hover:border-gold-300 hover:shadow-md focus-visible:ring-green-500 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:min-h-44 sm:w-40 sm:shrink-0 sm:gap-4 sm:px-3 sm:pt-6 sm:pb-4',
          item.current ? 'border-gold-400 shadow-md' : 'border-transparent',
        )

        return (
          <li className="min-w-0" key={item.key}>
            {item.href ? (
              <Link
                aria-current={item.current ? 'page' : undefined}
                aria-label={`Browse ${item.title} products`}
                className={className}
                href={item.href}
              >
                {tile}
                <span
                  aria-hidden="true"
                  className={cn(
                    'bg-gold-400 absolute inset-x-6 bottom-0 h-1 origin-center rounded-t-full transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none',
                    item.current ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </Link>
            ) : (
              <div className={className}>{tile}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
