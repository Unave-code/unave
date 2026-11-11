import { BadgeCheck, ChefHat, Flame, HeartHandshake, MessageCircle, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import React from 'react'

import { BENEFITS, BENEFITS_HEADING, BENEFITS_INTRO } from '@/utilities/homeCopy'
import { cn } from '@/utilities/ui'

import { Section } from './Section'

/** The glyph each reason leads with, keyed by the `icon` name in the copy. */
const BENEFIT_ICONS = {
  badge: BadgeCheck,
  chef: ChefHat,
  flame: Flame,
  message: MessageCircle,
  preference: HeartHandshake,
  refresh: RefreshCw,
} as const

/**
 * The bento shape (design.md §6.7): what each tile is worth in a three-column grid
 * from `lg` up, in the order the reasons appear — wide, tall, small, small, wide,
 * small. The tall tile is one column wide and two rows deep, which is what lets the
 * two small tiles sit underneath the first wide one; every cell of the three rows
 * is filled, so the block interlocks instead of stacking in bands. The three
 * reasons whose copy carries a photograph are the wide and the tall tiles.
 *
 * `sizes` feeds `next/image`, so a tile only pulls the pixels its own column needs:
 * two thirds of the container for a wide tile, a third for the rest.
 */
const TILES: readonly { className: string; sizes: string }[] = [
  { className: 'lg:col-span-2', sizes: '66vw' },
  { className: 'lg:row-span-2', sizes: '33vw' },
  { className: 'lg:col-span-1', sizes: '33vw' },
  { className: 'lg:col-span-1', sizes: '33vw' },
  { className: 'lg:col-span-2', sizes: '66vw' },
  { className: 'lg:col-span-1', sizes: '33vw' },
]

/**
 * The six reasons, drawn as one bento rather than a grid of equal cards (design.md
 * §6.7). It sits between two card grids — the four food types above it and the
 * product shelf below — so a third grid of six identical boxes would read as
 * filler, and a bento with three photographed tiles says the same thing with a
 * shape of its own.
 *
 * Every tile leads with its icon in a chip instead of a number: the reasons are not
 * a sequence, so numbering them only implied an order that does not exist. The
 * icons and the photographed tiles are decorative — the words carry the claim — so
 * they stay out of the accessibility tree.
 */
export const Benefits: React.FC = () => (
  <Section tone="white">
    <h2 className="text-h2">{BENEFITS_HEADING}</h2>
    <p className="text-body text-ink-600 mt-4 max-w-[58ch]">{BENEFITS_INTRO}</p>

    <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5" role="list">
      {BENEFITS.map((benefit, index) => {
        const photo = 'image' in benefit ? benefit.image : null
        const tile = TILES[index]
        const Icon = BENEFIT_ICONS[benefit.icon]

        return (
          <li
            className={cn(
              'relative flex min-h-[14rem] flex-col justify-between overflow-hidden rounded-md p-6 lg:min-h-[16rem] lg:p-7',
              tile.className,
              photo ? 'text-cream' : 'bg-card border-line border shadow-sm',
            )}
            key={benefit.title}
          >
            {photo ? (
              <>
                <Image
                  alt=""
                  aria-hidden="true"
                  className="object-cover"
                  fill
                  quality={75}
                  sizes={`(min-width: 1024px) ${tile.sizes}, (min-width: 640px) 50vw, 100vw`}
                  src={photo}
                />
                {/* The scrim is darkest where the words sit, so the copy clears AA
                    over whatever the photograph happens to hold. */}
                <span
                  aria-hidden="true"
                  className="from-green-900/95 via-green-900/60 pointer-events-none absolute inset-0 bg-linear-to-t to-green-900/10"
                />
              </>
            ) : null}

            <span
              aria-hidden="true"
              className={cn(
                'relative grid size-11 shrink-0 place-items-center rounded-full',
                photo ? 'bg-gold-400 text-green-900' : 'bg-green-100 text-green-700',
              )}
            >
              <Icon className="size-5" strokeWidth={2} />
            </span>

            <div className="relative mt-6">
              <h3 className="text-h3">{benefit.title}</h3>
              <p className={cn('text-body mt-1.5', photo ? 'text-cream/90' : 'text-ink-600')}>
                {benefit.body}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  </Section>
)
