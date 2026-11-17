import { CookingPot, Leaf, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { Media } from '@/components/Media'
import type { Media as MediaDoc } from '@/payload-types'
import type { ProductCategoryValue } from '@/utilities/productsCategoryCopy'
import { cn } from '@/utilities/ui'

/** Each shelf gets its own icon, so a tile without a photo still says which
 *  kind of food it leads to (design.md §3.4). */
export const CATEGORY_LOOK: Record<ProductCategoryValue | 'fallback', { Icon: LucideIcon }> = {
  'fresh-from-produce': { Icon: Leaf },
  'ready-to-cook': { Icon: CookingPot },
  'ready-to-eat': { Icon: UtensilsCrossed },
  fallback: { Icon: Leaf },
}

export interface CategoryTile {
  /** Marks the tile for the view the customer is already on. */
  current?: boolean
  /** Which shelf's icon to show when there is no photo. */
  category?: ProductCategoryValue
  href: null | string
  image?: MediaDoc | null
  key: number | string
  title: string
}

/**
 * The category tiles (design.md §10.1): small tiles in a wrapping layout, at
 * least 128px wide from `sm` with roomy side padding, each with a large bare
 * icon (no circle), a green border and a large shadow. Each category page uses
 * them for its subcategories.
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
        const { Icon } = CATEGORY_LOOK[item.category ?? 'fallback'] ?? CATEGORY_LOOK.fallback
        const tile = (
          <>
            <span
              aria-hidden="true"
              className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg sm:size-14"
            >
              {image ? (
                <Media
                  alt=""
                  fill
                  imgClassName="object-cover transition-transform duration-500 ease-out group-hover:scale-110 motion-reduce:group-hover:scale-100"
                  resource={image}
                  size="56px"
                />
              ) : (
                <Icon
                  className="size-11 text-green-700 transition-[color,transform] duration-300 ease-out group-hover:scale-110 group-hover:text-green-800 motion-reduce:group-hover:scale-100 sm:size-12"
                  strokeWidth={1.5}
                />
              )}
            </span>
            <h3
              className="text-caption text-green-900 line-clamp-2 w-full wrap-anywhere font-semibold leading-tight"
              title={item.title}
            >
              {item.title}
            </h3>
          </>
        )
        const className = cn(
          'group relative flex h-full min-h-28 w-full min-w-0 flex-col items-center justify-start gap-2 overflow-hidden rounded-xl border-2 bg-gradient-to-b from-green-50 from-0% via-card via-45% to-card px-4 pt-3 pb-3 text-center shadow-lg transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-1 hover:border-gold-300 hover:shadow-[0_20px_48px_rgba(26,75,54,0.2)] focus-visible:ring-green-500 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-auto sm:min-w-32 sm:max-w-48 sm:shrink-0 sm:px-6',
          item.current ? 'border-gold-400' : 'border-green-200',
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
